# -*- coding: utf-8 -*-
import zipfile
import xml.etree.ElementTree as ET
import sys

sys.stdout.reconfigure(encoding='utf-8')

path = r"F:\order_workflow\商品底价表\出厂底价表.xlsx"
with zipfile.ZipFile(path, 'r') as z:
    styles_tree = ET.fromstring(z.read('xl/styles.xml'))
    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    
    fonts = styles_tree.findall('.//ns:fonts/ns:font', ns)
    print(f"Total fonts: {len(fonts)}")
    for i, f in enumerate(fonts[:8]):
        name = f.find('ns:name', ns).attrib.get('val') if f.find('ns:name', ns) is not None else ''
        sz = f.find('ns:sz', ns).attrib.get('val') if f.find('ns:sz', ns) is not None else ''
        bold = f.find('ns:b', ns) is not None
        color = f.find('ns:color', ns).attrib if f.find('ns:color', ns) is not None else {}
        print(f"  Font {i}: name={name}, sz={sz}, bold={bold}, color={color}")
        
    fills = styles_tree.findall('.//ns:fills/ns:fill', ns)
    print(f"Total fills: {len(fills)}")
    for i, fill in enumerate(fills):
        pattern = fill.find('ns:patternFill', ns)
        if pattern is not None:
            ptype = pattern.attrib.get('patternType')
            fg = pattern.find('ns:fgColor', ns).attrib if pattern.find('ns:fgColor', ns) is not None else {}
            print(f"  Fill {i}: type={ptype}, fg={fg}")

    # Check sheet 1 and sheet 2 first few rows cell format indices
    s1_tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    print("\nSheet 1 row 1-5 cells styling indices:")
    for row in s1_tree.findall('.//ns:row', ns)[:6]:
        r_num = row.attrib.get('r')
        for c in row.findall('ns:c', ns)[:3]:
            print(f"  r={r_num}, c={c.attrib.get('r')}, s={c.attrib.get('s')}")

    s2_tree = ET.fromstring(z.read('xl/worksheets/sheet2.xml'))
    print("\nSheet 2 header cells styling indices:")
    for c in s2_tree.findall('.//ns:row', ns)[0].findall('ns:c', ns)[:4]:
        print(f"  c={c.attrib.get('r')}, s={c.attrib.get('s')}")
