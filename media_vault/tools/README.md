# KelvinFlow · 自动化配音引擎使用指南 (Edge-TTS)

基于微软顶级 Neural 神经网络语音合成引擎，完全免费、无需购买 API Key、支持离线/免翻墙高保真输出。

---

## 快速安装环境

在命令行中进入当前目录并安装 Python 依赖包：

```bash
pip install -r requirements.txt
```

*(或者直接执行：`pip install edge-tts`)*

---

## 核心使用场景与命令

### 1. 一键运行官方 Demo（自动为两期视频号脚本生成配音）
自动解析 `media_vault/scripts/channels/` 下的工业级分镜头 Markdown，提取台词并生成两份成品 MP3：
```bash
python generate_voice.py --demo
```
生成文件位于：`media_vault/output/audio/`

---

### 2. 从分镜头 Markdown 脚本中一键提取台词并合成
无需手动复制台词，系统自动识别表格中【口播台词】列并过滤非台词噪音：
```bash
python generate_voice.py --script ../scripts/channels/ch_01_night_quote_boss_loss.md -o ch_01.mp3 --voice yunxi --rate +6%
```

---

### 3. 直接输入台词快速配音
```bash
python generate_voice.py -t "半夜两点欧美客户急要报价，你还在被窝里算海运费？" -o test.mp3 --voice yunjian
```

---

### 4. 查看所有支持的中文音色库
```bash
python generate_voice.py --list-voices
```

| 快捷代号 | 微软音色标识 | 推荐场景与特征 |
| :--- | :--- | :--- |
| **`yunxi`** | `zh-CN-YunxiNeural` | **短视频口播王牌**：阳光、富有感染力、快节奏、吸睛 |
| **`yunjian`** | `zh-CN-YunjianNeural` | **商业老板篇**：沉稳厚重、磁性中年、适合商业故事与认知分享 |
| **`yunyang`** | `zh-CN-YunyangNeural` | **官方宣传片**：专业播音腔、字正腔圆、适合产品发布会 |
| **`xiaoxiao`** | `zh-CN-XiaoxiaoNeural` | **温和女声**：知性自然、教程指导、案例复盘 |
