#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KelvinFlow · 短视频与自媒体自动化配音引擎 (Edge-TTS 本地配音工具)
===========================================================
基于 Microsoft Edge 顶级自然度神经网络语音 (Neural TTS)，完全免费、无需 API 秘钥。
支持从纯文本、文本文件、以及分镜头 Markdown 脚本中一键提取口播台词并合成高保真 MP3。

依赖安装：
    pip install edge-tts asyncio

快速上手示例：
    # 1. 运行内置 Demo（一键合成视频号脚本 01 与 02 的配音 MP3）
    python generate_voice.py --demo

    # 2. 直接传入文本合成
    python generate_voice.py -t "半夜两点欧美客户急要报价，你还在被窝里算海运费？" -o test.mp3

    # 3. 从视频号工业级分镜头 Markdown 脚本中自动提取所有台词并合成
    python generate_voice.py --script ../scripts/channels/ch_01_night_quote_boss_loss.md -o ch_01_voice.mp3

    # 4. 查看推荐音色库
    python generate_voice.py --list-voices
"""

import sys
import os
import re
import argparse
import asyncio

# 确保 Windows 终端控制台安全支持 UTF-8 与 Emoji
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# 预设顶级微软自然中文音色
RECOMMENDED_VOICES = {
    "yunxi": {
        "id": "zh-CN-YunxiNeural",
        "name": "云希 (活力短视频/阳光青年)",
        "desc": "极其适合小红书、抖音、视频号等快节奏痛点类口播，情绪饱满自然，带货与抓人首选"
    },
    "yunjian": {
        "id": "zh-CN-YunjianNeural",
        "name": "云健 (沉稳影视/商业老道)",
        "desc": "磁性深沉男声，适合工贸出海、商业认知、老板账本、纪录片解说"
    },
    "yunyang": {
        "id": "zh-CN-YunyangNeural",
        "name": "云扬 (专业新闻/商业播音)",
        "desc": "字正腔圆，适合企业官方宣传片、产品官方功能深度评测"
    },
    "xiaoxiao": {
        "id": "zh-CN-XiaoxiaoNeural",
        "name": "晓晓 (知性女声/亲切自然)",
        "desc": "温和自然，适合出海干货分享、新手外贸教程与案例访谈"
    }
}

DEFAULT_VOICE = RECOMMENDED_VOICES["yunxi"]["id"]


def check_dependencies():
    """检查依赖库是否已安装"""
    try:
        import edge_tts
        return True
    except ImportError:
        print("\n" + "=" * 65)
        print("❌ 未检测到依赖库 edge-tts，请先执行以下命令安装：")
        print("   pip install edge-tts asyncio")
        print("=" * 65 + "\n")
        return False


def extract_spoken_lines_from_script(markdown_path: str) -> str:
    """
    智能解析工业级分镜头脚本 Markdown 表格：
    提取所有【口播台词】列的内容并按顺序合并为纯文本。
    """
    if not os.path.exists(markdown_path):
        raise FileNotFoundError(f"找不到指定的脚本文件: {markdown_path}")

    with open(markdown_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 匹配 Markdown 表格行，例如：| **01** | `00:00 - 00:03` | 特写 | 画面... | **台词** (xx字) | 音效 | 花字 |
    lines = content.splitlines()
    spoken_lines = []

    for line in lines:
        line_str = line.strip()
        if not line_str.startswith("|"):
            continue
        parts = [p.strip() for p in line_str.split("|")]
        # 标准表格至少有 7 列（首尾为空字符，故 parts 长度通常为 8 或 9）
        # 列顺序通常为: [0]空, [1]镜头号, [2]时间, [3]景别, [4]画面, [5]口播台词, [6]音效/BGM, [7]花字, [8]空
        if len(parts) >= 7:
            cell_text = parts[5]  # 口播台词列
            # 过滤表头
            if "口播" in cell_text or "台词" in cell_text or "---" in cell_text:
                continue
            # 清理加粗标记 ** 以及括号内的字数统计，如 (27字)
            cleaned = re.sub(r"\*\*([^*]+)\*\*", r"\1", cell_text)
            cleaned = re.sub(r"\(\d+字\)", "", cleaned).strip()
            if cleaned:
                spoken_lines.append(cleaned)

    if not spoken_lines:
        # 如果不是标准表格，尝试整篇寻找加粗台词或直接返回全文
        bold_matches = re.findall(r"\*\*(?:【口播】|台词|主播|Kelvin)?[:：]?\s*([^*]{10,})\*\*", content)
        if bold_matches:
            spoken_lines = bold_matches
        else:
            raise ValueError(f"在 {markdown_path} 中未匹配到标准分镜头表格的口播台词！")

    full_text = " ".join(spoken_lines)
    return full_text


async def text_to_speech(
    text: str,
    output_path: str,
    voice: str = DEFAULT_VOICE,
    rate: str = "+5%",
    volume: str = "+0%",
    pitch: str = "+0Hz"
):
    """调用 edge-tts 引擎合成音频"""
    import edge_tts

    # 确保输出目录存在
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    print(f"🎙️  正在合成音频...")
    print(f"   • 音色选择: {voice}")
    print(f"   • 语速调整: {rate}")
    print(f"   • 文本字数: {len(text)} 字")
    print(f"   • 目标文件: {output_path}")

    communicate = edge_tts.Communicate(
        text=text,
        voice=voice,
        rate=rate,
        volume=volume,
        pitch=pitch
    )

    await communicate.save(output_path)
    print(f"✅ 音频合成完成！已保存至: {output_path}\n")


def list_voices():
    """打印推荐音色说明"""
    print("\n" + "=" * 65)
    print("🌟 KelvinFlow 官方推荐顶级中文 Neural 音色库：")
    print("=" * 65)
    for key, info in RECOMMENDED_VOICES.items():
        print(f"快捷代号: [{key}]")
        print(f"  • 系统标识: {info['id']}")
        print(f"  • 特色名称: {info['name']}")
        print(f"  • 适用场景: {info['desc']}")
        print("-" * 65)


async def run_demo():
    """运行内置 Demo，合成视频号两部核心分镜头脚本的音频"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    script1_path = os.path.join(base_dir, "..", "scripts", "channels", "ch_01_night_quote_boss_loss.md")
    script2_path = os.path.join(base_dir, "..", "scripts", "channels", "ch_02_solopreneur_no_hire.md")
    out_dir = os.path.join(base_dir, "..", "output", "audio")

    print("\n🚀 开始执行 KelvinFlow 脚本配音自动化 Demo...")

    # Demo 1: 视频号 01 (快节奏痛点，使用云希)
    if os.path.exists(script1_path):
        text1 = extract_spoken_lines_from_script(script1_path)
        out1 = os.path.join(out_dir, "ch_01_night_quote_boss_loss.mp3")
        print(f"\n[1/2] 正在合成第 1 条视频配音 (云希音色)...")
        await text_to_speech(
            text=text1,
            output_path=out1,
            voice=RECOMMENDED_VOICES["yunxi"]["id"],
            rate="+6%"
        )
    else:
        print(f"未找到脚本: {script1_path}")

    # Demo 2: 视频号 02 (沉稳商业认知，使用云健)
    if os.path.exists(script2_path):
        text2 = extract_spoken_lines_from_script(script2_path)
        out2 = os.path.join(out_dir, "ch_02_solopreneur_no_hire.mp3")
        print(f"\n[2/2] 正在合成第 2 条视频配音 (云健音色)...")
        await text_to_speech(
            text=text2,
            output_path=out2,
            voice=RECOMMENDED_VOICES["yunjian"]["id"],
            rate="+3%"
        )
    else:
        print(f"未找到脚本: {script2_path}")

    print("🎉 Demo 全部完成！生成的 MP3 音频可直接导入剪映/Premiere 使用。")


def main():
    parser = argparse.ArgumentParser(
        description="KelvinFlow · 短视频与自媒体自动化配音工具 (基于 Edge-TTS)"
    )
    parser.add_argument("-t", "--text", type=str, help="直接输入的口播台词字符串")
    parser.add_argument("-f", "--file", type=str, help="包含待配音纯文本的文件路径")
    parser.add_argument("-s", "--script", type=str, help="分镜头 Markdown 脚本路径 (自动提取表格台词)")
    parser.add_argument("-o", "--output", type=str, default="output.mp3", help="输出音频文件路径 (默认 output.mp3)")
    parser.add_argument("-v", "--voice", type=str, default="yunxi", help="音色快捷名 (yunxi, yunjian, yunyang, xiaoxiao) 或完整音色名")
    parser.add_argument("-r", "--rate", type=str, default="+5%", help="语速调节，例如 +5%, +10%, -5% (默认 +5%)")
    parser.add_argument("--volume", type=str, default="+0%", help="音量调节 (默认 +0%)")
    parser.add_argument("--pitch", type=str, default="+0Hz", help="音调调节 (默认 +0Hz)")
    parser.add_argument("--demo", action="store_true", help="一键运行 Demo 模式，自动为两部视频号脚本生成配音")
    parser.add_argument("--list-voices", action="store_true", help="列出所有推荐音色")

    args = parser.parse_args()

    if args.list_voices:
        list_voices()
        return

    if not check_dependencies():
        sys.exit(1)

    if args.demo:
        asyncio.run(run_demo())
        return

    # 解析音色参数
    voice_key = args.voice.lower()
    if voice_key in RECOMMENDED_VOICES:
        selected_voice = RECOMMENDED_VOICES[voice_key]["id"]
    else:
        selected_voice = args.voice

    # 获取口播文本
    spoken_text = ""
    if args.script:
        print(f"📖 正在从 Markdown 分镜头脚本提取台词: {args.script}")
        spoken_text = extract_spoken_lines_from_script(args.script)
    elif args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            spoken_text = f.read().strip()
    elif args.text:
        spoken_text = args.text.strip()
    else:
        print("💡 请提供台词内容！使用 -t '文案'，-f <文件>，--script <分镜头脚本>，或运行 --demo")
        parser.print_help()
        return

    if not spoken_text:
        print("❌ 错误：提取到的台词内容为空！")
        return

    print(f"\n📝 提取到的口播文案预览 (前 80 字)：\n   “{spoken_text[:80]}...”\n")

    asyncio.run(text_to_speech(
        text=spoken_text,
        output_path=args.output,
        voice=selected_voice,
        rate=args.rate,
        volume=args.volume,
        pitch=args.pitch
    ))


if __name__ == "__main__":
    main()
