---
title: '给 WorkBuddy 写个图片搜索 Skill'
pubDatetime: 2026-03-20
description: '从零开始构建 tool-image Skill，基于 Unsplash API 实现自动配图功能'
ogImage: './image/260320_01.png'
tags: [AI, Tool, Tutorial]
draft: false
---

![给 WorkBuddy 写个图片搜索 Skill](./image/260320_01.png)

## 为什么会有这个 Skill

之前给文章配图，流程是这样的：

1. 打开 Unsplash 网站  
2. 搜索关键词（中文搜不到换英文）  
3. 翻几页找合适的图  
4. 下载到本地  
5. 调整尺寸（博客文章一般 600px 宽）  
6. 写 Markdown 链接  
7. 找摄影师信息写致谢  

一篇文章配图要 5-10 分钟，效率太低。

于是写了这个 tool-image Skill，一句话搞定所有事情。

---

## Skill 实现原理

tool-image Skill 基于 Unsplash API 实现。

**工作流程：**

- 接收关键词（英文）  
- 调用 Unsplash Search API  
- 返回第一张图片的 Markdown 格式（带摄影师致谢）  
- 自动限制图片尺寸为 600×400px  

---

## 完整代码

Skill 文件：`workbuddy\skills\tool-image\tools\image_search.py`

```python
#!/usr/bin/env python3
import argparse
import warnings
import sys
import requests
from urllib.parse import quote

warnings.filterwarnings("ignore")

ACCESS_KEY = "占位符"

def image_search(query: str, count: int = 1) -> str:
    clean_query = quote(" ".join(query.split()[:5]))
    
    url = "https://api.unsplash.com/search/photos"
    params = {
        "query": clean_query,
        "per_page": count,
        "client_id": ACCESS_KEY
    }
    
    try:
        res = requests.get(url, params=params, timeout=15)
        res.raise_for_status()
        data = res.json()
    except Exception as e:
        return f"Error: {str(e)}"
    
    results = data.get("results", [])
    if not results:
        return f"No images found for query: {clean_query}"
    
    output = []
    for item in results[:count]:
        img_url = item["urls"]["regular"] + "?w=600&h=400&fit=crop&q=80"
        
        author = item["user"]["name"]
        profile = item["user"]["links"]["html"]
        
        markdown = (
            f"![{clean_query}]({img_url})\n"
            f"*Photo by [{author}]({profile}) on [Unsplash](https://unsplash.com)*"
        )
        output.append(markdown)
    
    return "\n\n".join(output)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Search Unsplash images")
    parser.add_argument("--object", required=True)
    parser.add_argument("--number", type=int, default=1)
    
    args = parser.parse_args()
    
    result = image_search(args.object, args.number)
    print(result)
````

---

## API Key 说明

```python
ACCESS_KEY = "占位符"
```

可以直接使用，也可以替换成自己的。

**申请方式：**

1. 注册 Unsplash
2. 打开 [https://unsplash.com/developers](https://unsplash.com/developers)
3. 创建应用
4. 替换 Key

---

## 执行脚本

脚本路径：
`WorkBuddy\Claw\scripts\search_image.ps1`

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$Object,
    
    [int]$Number = 1
)

python "image_search.py" --object $Object --number $Number
```

**使用方式：**

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File "search_image.ps1" -Object "artificial intelligence" -Number 1
```

---

## 实际案例演示

### 案例 1：《研究生奴隶》配图

关键词：

```powershell
university student studying library
```

效果如下：

![university student studying library](./image/260320_02.jpg)

*Photo by [Dominic Kurniawan Suryaputra](https://unsplash.com/@d_ks11) on [Unsplash](https://unsplash.com)*

---

### 案例 2：《Python 与 C 混编》配图

关键词：

```powershell
python c programming code
```

效果如下：

![python c programming code](./image/260320_03.jpg)

*Photo by [Hitesh Choudhary](https://unsplash.com/@hiteshchoudhary) on [Unsplash](https://unsplash.com)*

---

## 关键词选择技巧

| 搜索词                                 | 结果质量 | 原因    |
| ----------------------------------- | ---- | ----- |
| 研究生                                 | ❌ 差  | 太抽象   |
| university student                  | ✅ 中  | 不够具体  |
| university student studying library | ✅✅ 好 | 场景+动作 |

### 原则

* 英文优先
* 场景词优先
* 动作词优先
* 越具体越好

---

## 封面图 vs 内插图

### 封面图

```markdown
image: './image/YYMMDD_01.ext'
```

* 本地存储
* 永久有效
* 占空间

---

### 内插图

```markdown
![关键词](url)
```

* 外链
* 快速
* 不占空间
* 依赖网络

---

## 版权说明

所有图片来自 Unsplash：

* 免费使用（商用+个人）
* 无需授权
* 建议标注摄影师

---

## 故障排查

### Key 未设置

```powershell
$env:UNSPLASH_ACCESS_KEY = "你的AccessKey"
```

---

### 搜不到图

* 换英文
* 增加具体描述

---

### 尺寸问题

```python
?w=600&h=400&fit=crop
```

---

## Skill 配置

路径：

```
workbuddy\skills\tool-image\
```

核心文件：

```
workbuddy\skills\tool-image\tools\image_search.py
```

---

## 总结

这个 Skill 本质上是：

> 把“找图 → 下载 → 处理 → 写 Markdown”自动化

效果：

* 5–10 分钟 → 10 秒
* 输出直接可用
* 自动符合版权规范

现在写文章，配图不再是负担。

