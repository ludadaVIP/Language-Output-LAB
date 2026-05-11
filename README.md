# Language Output Lab

一个本地 Flask + React 语言输出练习 app。当前迁移了原 HTML 里的西班牙语写作题库；四种语言、口语/写作入口都已预留。

## 运行

先安装：

- Python 3.10+
- Node.js LTS, includes `npm`

第一次启动会自动创建 `.venv`、安装 Python/Node 依赖并构建前端。

Mac:

```bash
./start.command
```

Windows:

```bat
start.bat
```

也可以手动运行：

Mac:

```bash
python3 start.py
```

Windows:

```bat
py -3 start.py
```

默认地址：

```text
http://127.0.0.1:8770
```

## 题库目录

一个话题一个 JSON：

```text
data/topics/<language>/<skill>/<topic-id>.json
```

语言：

```text
en, es, fr, de
```

技能：

```text
speaking, writing
```

## JSON 格式

```json
{
  "id": "future-work",
  "language": "en",
  "skill": "writing",
  "category": "Work",
  "title": "The future of work",
  "prompt": "Write about how work may change in the next ten years.",
  "format": "Opinion essay · 180-220 words",
  "levelRange": "B1 - C1",
  "examples": [
    {
      "level": "B1",
      "title": "A simple view",
      "body": "Example paragraph one.\n\nExample paragraph two."
    },
    {
      "level": "C1",
      "title": "A nuanced view",
      "body": "Example paragraph one.\n\nExample paragraph two."
    }
  ]
}
```

`examples` 是数组，所以以后 A1-C2、两篇范文、三篇范文或更多 level 都可以直接靠数据扩展。

## 朗读

朗读走后端 Edge TTS，音频会缓存到：

```text
data/audio/tts/<language>/
```

`data/audio/` 是本地缓存，不需要提交到 git。

## Git

这个项目会提交源码、题库 JSON、启动脚本和依赖清单。下面这些是本机生成内容，不进版本库：

```text
.venv/
node_modules/
frontend/dist/
data/audio/
__pycache__/
.DS_Store
```

Windows 上启动脚本会自动使用 `npm.cmd`；Mac/Linux 会使用 `npm`。如果换电脑后启动失败，先确认 Python 和 Node.js 都已安装，并重新运行 `start.bat` 或 `start.command`。
