# Word 题库解析与在线刷题器

> 把几十页 Word 试题转成结构化题库，并渲染成能判分的刷题页。

## 它解决什么

老师发来的是几十页 Word，题目混着「单选 / 多选 / 判断」，题号格式还不统一。手工抄进刷题 App 不现实，这个项目做的是**把非结构化文档转成结构化题库**，再渲染成可交互页面。

## 关键实现

- **解析**：按题型分节，识别题号、题干、选项、答案四类字段；对合并段落、全角字符、序号错乱做容错
- **切分**：按章节输出独立题库，避免一次加载上千题
- **前端**：单选 / 多选 / 判断分别渲染，作答即时判分并汇总错题

> 仓库只包含解析与前端代码，不附带题库原始内容。

## 技术栈

- **语言**：Python 3（`python-docx` 解析）+ 原生 JS
- **产物**：结构化题库 JSON + 单页刷题界面

## 目录结构

```
  app.js
  convert_all.py
  convert_and_read.py
  debug_parse_ch3.py
  index.html
  inspect_all.py
  inspect_ch3.py
  inspect_ch5.py
  inspect_ch5_end.py
  inspect_ch5_unicode.py
  inspect_ch8.py
  inspect_ch8_q16.py
  ... 另 14 个文件
```

## 快速开始

`python convert_all.py <你的 docx>` 生成题库 JSON，再用本地服务器打开 `index.html`。

---

<sub>个人工程归档 · 2026 · MIT</sub>
