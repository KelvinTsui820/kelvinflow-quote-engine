#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小红书笔记发布前合规与风控自动检测工具 (Xiaohongshu Compliance Checker)
作者: IT佬Kelvin 专职操盘团队
功能: 扫描指定 Markdown 笔记或文本，秒级识别违禁词、跨平台导流词、广告法绝对化词汇及油腻营销黑话。
"""

import sys
import re
import argparse
from pathlib import Path

# 适配 Windows 控制台 UTF-8 输出
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# 违规词规则库定义
RULES = {
    "🔴 跨平台导流违规 (致命风险 - 必封/限流)": {
        "level": "CRITICAL",
        "patterns": [
            r"微信", r"[vV][xX]", r"[vV]信", r"\+[vV]", r"加[vV]", r"[wW][xX]",
            r"扣扣", r"[qQ][qQ]", r"淘宝", r"拼多多", r"百度网盘", r"夸克网盘",
            r"公众号", r"扫码", r"二维码", r"电话", r"手机号", r"私我", r"私信我",
            r"联系方式", r"加我", r"留邮箱"
        ],
        "suggestion": "改用官方合规通道：引导至‘主页群聊’、‘群文件自取’或评论区‘打卡自取’。"
    },
    "🟡 广告法绝对化与夸大 (中度风险 - 触发降权)": {
        "level": "WARNING",
        "patterns": [
            r"最[好强快棒佳新全美纯大高低]", r"第一", r"唯一", r"顶级", r"极致",
            r"神器", r"万能", r"100%", r"全网最", r"永久免费", r"首家",
            r"绝症", r"神药"
        ],
        "suggestion": "替换为客观务实描述：如‘实用工具’、‘常用公式’、‘带加密锁格版’。"
    },
    "🟡 搞钱投机与割韭菜黑话 (中度风险 - 算法审查)": {
        "level": "WARNING",
        "patterns": [
            r"暴富", r"躺赚", r"搞钱", r"暴利", r"0门槛", r"零门槛",
            r"包过", r"包学会", r"月入[过\d万]+", r"割韭菜", r"搞副业"
        ],
        "suggestion": "替换为技能与提效视角：如‘效率提升’、‘解决繁琐手工’、‘独立全栈实录’。"
    },
    "🟡 敏感技术与外挂黑产 (中度风险 - 科技类特有)": {
        "level": "WARNING",
        "patterns": [
            r"外挂", r"破解", r"破解版", r"免越狱", r"爬虫", r"抓包", r"群控", r"防封"
        ],
        "suggestion": "替换为合规技术词汇：如‘自研轻量脚本’、‘数据同步’、‘自动化流程’。"
    },
    "⚪ 油腻营销、北方黑话与不合人设词汇 (风格偏离 - 违反白皮书人设)": {
        "level": "STYLE",
        "patterns": [
            r"好家伙", r"折腾", r"瞅瞅", r"老铁", r"苦熬", r"代码有温度",
            r"绝绝子", r"家人们谁懂啊", r"闭眼入", r"赋能", r"闭环",
            r"打假", r"手痒", r"折磨", r"野生程序员"
        ],
        "suggestion": "与‘大湾区务实IT老友’人设违和，白皮书模块二严令禁止，请使用通俗平实大湾区口吻。"
    },
    "🔴 产品功能虚假夸大与不实宣传 (真实性红线 - 必须对齐真实代码)": {
        "level": "CRITICAL",
        "patterns": [
            r"自动[联网抓拉取]+汇率", r"汇率接口每小时自动拉取", r"自动抓取中行汇率",
            r"一键.*转出脱敏.*发[给客户老外]", r"工艺选配自动[累暗箱加]+",
            r"自动暗箱累加"
        ],
        "suggestion": "严格对应白皮书模块四：Excel是内部测算表（汇率手动填入联动倒算、不可直接发客户）；暗箱工艺加价已在代码中彻底切除。"
    }
}

def scan_text(text: str):
    lines = text.splitlines()
    findings = []
    
    for line_num, line in enumerate(lines, 1):
        for category, info in RULES.items():
            for pat in info["patterns"]:
                matches = re.finditer(pat, line, re.IGNORECASE)
                for m in matches:
                    findings.append({
                        "line": line_num,
                        "category": category,
                        "level": info["level"],
                        "matched": m.group(),
                        "context": line.strip(),
                        "suggestion": info["suggestion"]
                    })
    return findings

def print_report(findings, file_path="输入文本"):
    print("=" * 70)
    print(f"📊 小红书发布前合规自检报告: {file_path}")
    print("=" * 70)
    
    critical_count = sum(1 for f in findings if f["level"] == "CRITICAL")
    warning_count = sum(1 for f in findings if f["level"] == "WARNING")
    style_count = sum(1 for f in findings if f["level"] == "STYLE")
    
    if not findings:
        print("\n✅ 【完美通过】未检测到任何违禁词或风控高危项，可以放心发布！\n")
        return True
    
    print(f"发现问题项: 致命风险 {critical_count} 处 | 降权风险 {warning_count} 处 | 风格建议 {style_count} 处\n")
    
    for idx, f in enumerate(findings, 1):
        print(f"[{idx}] {f['category']}")
        print(f"    行号: 第 {f['line']} 行")
        print(f"    命中词: 【{f['matched']}】")
        print(f"    原句: \"{f['context']}\"")
        print(f"    💡 优化建议: {f['suggestion']}")
        print("-" * 70)
        
    print("\n🚨 最终发布判定:")
    if critical_count > 0:
        print("❌ 【发布被拒】存在致命导流违禁词，发布将直接面临限流或账号封禁风险，必须修改！")
        return False
    elif warning_count > 0:
        print("⚠️ 【警告通过】存在广告法或夸大词汇，建议修改后再发布以获取最佳推流。")
        return True
    else:
        print("💡 【风格提示】存在少量营销词，不影响推流，但建议微调保持务实人设。")
        return True

def main():
    parser = argparse.ArgumentParser(description="小红书笔记合规自检工具")
    parser.add_argument("file", nargs="?", help="要扫描的 Markdown 笔记路径")
    parser.add_argument("--text", "-t", help="直接传入文本检测")
    args = parser.parse_args()

    if args.text:
        findings = scan_text(args.text)
        passed = print_report(findings, "命令行文本")
        sys.exit(0 if passed else 1)
        
    if args.file:
        p = Path(args.file)
        if not p.exists():
            print(f"错误: 文件未找到: {args.file}")
            sys.exit(2)
        content = p.read_text(encoding="utf-8")
        findings = scan_text(content)
        passed = print_report(findings, str(p))
        sys.exit(0 if passed else 1)
        
    print("使用方式:")
    print("  python check_compliance.py F:\\xhs_operator\\scripts\\xiaohongshu\\post_01_master_ready.md")
    print("  python check_compliance.py -t \"加我微信领免费外贸核价神器\"")

if __name__ == "__main__":
    main()
