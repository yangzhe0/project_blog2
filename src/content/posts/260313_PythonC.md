---
title: 'Python 与 C 混编：当下还有必要吗？'
pubDatetime: 2026-03-13
description: '从AI推理到嵌入式，Python慢在哪、C补在哪，ctypes/Cython/CPython扩展/pybind11四种混编方式全对比。'
ogImage: './image/260313_01.png'
tags: [Python, C]
draft: false
---

![Python 与 C 混编：当下还有必要吗？](./image/260313_01.png)

如果你用 Python 写过稍微严肃一点的程序，大概率踢过这道墙：**跑得太慢了**。

加缓存、换算法、上 PyPy……能用的招都用了，最后还是差那么一口气。这时候有人会说：用 C 重写热点代码。你心里可能嘀咕——都 2026 年了，还需要这么原始吗？

这篇文章想认真回答这个问题，顺带把四种主流混编方式从头到尾走一遍。

---

## 为什么 Python 慢，慢到值得专门处理

Python 的慢不是"写得不够好"，是**语言设计层面的代价**。

每次执行一行代码，CPython 解释器都要：查类型、查属性、分发方法、管理引用计数……这一套走下来，比原生机器指令多出 10~100 倍的开销。`a + b` 在 C 里是一条 `ADD` 指令；在 Python 里是一次对象查找 + 类型检查 + `__add__` 调用 + 新对象分配。

GIL（全局解释器锁）进一步封死了多线程 CPU 并行的路。

**但 Python 本身并没有放弃性能——它把性能外包给了 C。**

你每天用的这些库，底层全是 C/C++：
- `numpy`：数组运算核心是 C，`np.dot` 调的是 BLAS
- `pandas`：大量操作走 Cython 或 C 扩展
- `PyTorch`：算子全在 C++/CUDA，Python 只是调度层
- `OpenCV`、`Pillow`、`lxml`……

Python 是胶水，C 是肌肉。这个分工在 AI 时代被放大了：你写的模型推理代码是 Python，但每一个矩阵乘法都在 C++ 内核里跑。当你想自定义一个算子、优化一段推理路径，你就必须去 C 那层动手。

所以问题不是"还有没有必要"，而是**你打算永远只停在胶水层，还是偶尔下到肌肉层**。

---

## 四种混编方式全景

从简单到复杂，从"能用就行"到"极致控制"：

```
ctypes → Cython → CPython C Extension → pybind11
越来越强，越来越接近底层，学习成本也依次递增
```

用一个统一的 demo 来对比：**写一个对整数数组求和的函数**，纯 Python 版本基准，然后分别用四种方式加速。

---

## 0. 基准：纯 Python

```python
def py_sum(arr):
    total = 0
    for x in arr:
        total += x
    return total
```

100万元素跑一次大概 **50~80ms**。后面四种方式都跟这个比。

---

## 1. ctypes：零门槛调 C 编译产物

**适合场景**：已有现成的 `.so` / `.dll`，或者只想快速验证一个想法。

### C 代码

```c
// fast_sum.c
#include <stdint.h>

long long c_sum(int *arr, int n) {
    long long total = 0;
    for (int i = 0; i < n; i++) {
        total += arr[i];
    }
    return total;
}
```

编译成共享库：

```bash
# Linux/macOS
gcc -O2 -shared -fPIC -o fast_sum.so fast_sum.c

# Windows（MinGW）
gcc -O2 -shared -o fast_sum.dll fast_sum.c
```

### Python 调用

```python
import ctypes
import os

# 加载共享库
lib = ctypes.CDLL(os.path.join(os.path.dirname(__file__), "fast_sum.so"))

# 声明函数签名（必须，否则类型不对）
lib.c_sum.argtypes = [ctypes.POINTER(ctypes.c_int), ctypes.c_int]
lib.c_sum.restype = ctypes.c_longlong

def ctypes_sum(arr):
    # 把 Python list 转成 C 数组
    c_arr = (ctypes.c_int * len(arr))(*arr)
    return lib.c_sum(c_arr, len(arr))
```

### 性能对比

| 方式 | 100万元素耗时 |
|------|--------------|
| 纯 Python | ~65ms |
| ctypes | ~3ms |

优点：不用编译 Python 扩展，会 C 就会用，适合快速集成。  
缺点：类型声明繁琐，传 NumPy 数组需要额外处理（用 `arr.ctypes.data_as()`），不适合频繁调用的热点路径。

---

## 2. Cython：Python 语法写，编译成 C 跑

**适合场景**：想在 Python 代码上加速，不想完全切换到 C，NumPy 操作加速首选。

Cython 是 Python 的超集——你写的是 `.pyx` 文件，语法几乎和 Python 一样，但可以加类型声明，编译器把它变成 C 再编译成扩展模块。

### Cython 代码

```python
# fast_sum.pyx
def cy_sum(list arr):
    cdef long long total = 0
    cdef int i
    cdef int n = len(arr)
    for i in range(n):
        total += arr[i]
    return total
```

关键是 `cdef`——声明了 C 类型，循环里就不走 Python 对象系统了，直接变成 C 的整数运算。

### 编译配置

```python
# setup.py
from setuptools import setup
from Cython.Build import cythonize

setup(
    ext_modules=cythonize("fast_sum.pyx", compiler_directives={"language_level": "3"})
)
```

```bash
python setup.py build_ext --inplace
```

编译完会生成 `fast_sum.cpython-xxx.so`，直接 `import fast_sum` 就能用。

### NumPy 加速示例（Cython 真正的杀手锏）

```python
# numpy_sum.pyx
import numpy as np
cimport numpy as np

def cy_numpy_sum(np.ndarray[np.int32_t, ndim=1] arr):
    cdef long long total = 0
    cdef int i
    cdef int n = arr.shape[0]
    for i in range(n):
        total += arr[i]
    return total
```

`cimport numpy` 让 Cython 直接访问 NumPy 数组的 C 指针，绕过 Python 对象层，性能接近纯 C。

优点：渐进式优化，只改热点函数，其余代码不动；NumPy 生态集成最好。  
缺点：需要编译环境，发布时要带 `.so`；调试比纯 Python 麻烦。

---

## 3. CPython C Extension：最底层，最强控制

**适合场景**：要做 Python 内置模块级别的扩展，或者需要完全控制内存和对象生命周期。PyTorch 的 C++ 算子、NumPy 核心就是这个路子。

直接用 CPython 的 C API 写，代码量多，但没有任何中间层。

### C 代码

```c
// fast_sum_ext.c
#define PY_SSIZE_T_CLEAN
#include <Python.h>

// 实际的求和函数
static PyObject* ext_sum(PyObject *self, PyObject *args) {
    PyObject *list_obj;
    
    // 解析 Python 传入的参数
    if (!PyArg_ParseTuple(args, "O!", &PyList_Type, &list_obj)) {
        return NULL;
    }
    
    Py_ssize_t n = PyList_Size(list_obj);
    long long total = 0;
    
    for (Py_ssize_t i = 0; i < n; i++) {
        PyObject *item = PyList_GetItem(list_obj, i);  // 借用引用，不需要 Decref
        total += PyLong_AsLongLong(item);
    }
    
    return PyLong_FromLongLong(total);  // 返回 Python int 对象
}

// 模块方法表
static PyMethodDef FastSumMethods[] = {
    {"ext_sum", ext_sum, METH_VARARGS, "Sum a list of integers in C"},
    {NULL, NULL, 0, NULL}  // 哨兵
};

// 模块定义
static struct PyModuleDef fast_sum_module = {
    PyModuleDef_HEAD_INIT, "fast_sum_ext", NULL, -1, FastSumMethods
};

// 模块初始化函数（名字必须是 PyInit_<模块名>）
PyMODINIT_FUNC PyInit_fast_sum_ext(void) {
    return PyModule_Create(&fast_sum_module);
}
```

### 编译

```python
# setup.py
from setuptools import setup, Extension

module = Extension(
    "fast_sum_ext",
    sources=["fast_sum_ext.c"],
    extra_compile_args=["-O2"],
)

setup(name="fast_sum_ext", ext_modules=[module])
```

```bash
python setup.py build_ext --inplace
```

### Python 调用

```python
import fast_sum_ext
result = fast_sum_ext.ext_sum([1, 2, 3, 4, 5])
```

优点：零中间层，完全控制对象生命周期，可以做任何 Python 扩展能做的事。  
缺点：引用计数管理全靠手动（忘了 `Py_DECREF` 就内存泄漏），代码冗长，平均写一个简单函数要 50 行 C。不适合日常业务开发，适合造轮子。

---

## 4. pybind11：现代 C++ 绑定，最优雅

**适合场景**：项目本身是 C++，想暴露接口给 Python；或者不想手写 CPython C API 的模板代码。

pybind11 是头文件库，用 C++11 的模板魔法自动处理类型转换和引用计数，写起来比 CPython C Extension 简洁 5~10 倍。

### C++ 代码

```cpp
// fast_sum_bind.cpp
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>   // 自动转换 std::vector ↔ Python list
#include <vector>
#include <numeric>

namespace py = pybind11;

// 纯 C++ 函数，不需要任何 Python 相关代码
long long pb_sum(const std::vector<int>& arr) {
    return std::accumulate(arr.begin(), arr.end(), 0LL);
}

// 绑定模块
PYBIND11_MODULE(fast_sum_bind, m) {
    m.doc() = "pybind11 example";
    m.def("pb_sum", &pb_sum, "Sum a list of integers",
          py::arg("arr"));  // 支持关键字参数
}
```

### 编译

```python
# setup.py
from setuptools import setup, Extension
import pybind11

ext = Extension(
    "fast_sum_bind",
    sources=["fast_sum_bind.cpp"],
    include_dirs=[pybind11.get_include()],
    extra_compile_args=["-O2", "-std=c++14"],
    language="c++",
)

setup(name="fast_sum_bind", ext_modules=[ext])
```

```bash
pip install pybind11
python setup.py build_ext --inplace
```

### Python 调用

```python
import fast_sum_bind
result = fast_sum_bind.pb_sum([1, 2, 3, 4, 5])
# 也可以用关键字参数
result = fast_sum_bind.pb_sum(arr=[1, 2, 3, 4, 5])
```

pybind11 还能直接绑定 C++ 类：

```cpp
// 绑定一个 C++ 类到 Python
class Counter {
public:
    int count = 0;
    void increment() { count++; }
    int get() { return count; }
};

PYBIND11_MODULE(counter_module, m) {
    py::class_<Counter>(m, "Counter")
        .def(py::init<>())          // 构造函数
        .def("increment", &Counter::increment)
        .def("get", &Counter::get)
        .def_readwrite("count", &Counter::count);  // 直接暴露成员变量
}
```

Python 里直接当普通类用：

```python
from counter_module import Counter
c = Counter()
c.increment()
print(c.get())   # 1
print(c.count)   # 1
```

优点：代码最简洁，自动处理类型转换，支持类/异常/回调的完整绑定，现代 C++ 项目首选。  
缺点：依赖 pybind11 头文件，编译时间比 ctypes/Cython 长；纯 C 项目用不上（需要 C++11）。

---

## 四种方式横向对比

| | ctypes | Cython | CPython Extension | pybind11 |
|--|--------|--------|-------------------|----------|
| 学习成本 | 低 | 中 | 高 | 中 |
| 性能上限 | 高 | 高 | 最高 | 高 |
| 代码量 | 少（Python侧） | 中 | 多 | 少 |
| 需要编译 | 只编译C | 需要 | 需要 | 需要 |
| 适合语言 | C | Python/C | C | C++ |
| 调试难度 | 中 | 低 | 高 | 中 |
| 典型用户 | 快速集成现有库 | 科学计算加速 | 造轮子/做框架 | C++项目暴露接口 |

---

## 选哪个？

- **手头有现成 `.so`，或者快速验证** → ctypes，5分钟搞定
- **纯 Python 项目，想加速某个函数** → Cython，改动最小
- **要写 Python 模块/包给别人用，追求极致** → CPython Extension
- **项目本身是 C++** → pybind11，别犹豫

不用非选一个。实际项目里，ctypes 调系统库、Cython 加速业务逻辑、pybind11 封装 C++ 引擎，三者同时出现在一个代码库里很正常。

Python 是入口，C/C++ 是引擎——知道怎么打开引擎盖，你才算真的会开这辆车。


![Python 通过接口驱动 C/C++ 性能引擎](./image/260313_02.png)
