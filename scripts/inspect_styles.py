# -*- coding: utf-8 -*-
import zipfile
import xml.etree.ElementTree as ET
import sys

sys.stdout.reconfigure(encoding='utf-8')

def inspect(path):
    print("=" * 60)
    print("Inspecting:", path)
    with zipfile.ZipFile(path, 'r') as z:
        for item in ['xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']:
            tree = ET.fromstring(z.read(item))
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            cols = tree.findall('.//ns:col', ns)
            print(f"Cols in {item}:")
            for c in cols:
                print(f"  Col {c.attrib.get('min')}-{c.attrib.get('max')}: width={c.attrib.get('width')}")
            
            # Check row count and column count
            rows = tree.findall('.//ns:row', ns)
            print(f"Total rows in {item}: {len(rows)}")
            if rows:
                first_row = [c.attrib.get('r') for c in rows[0].findall('ns:c', ns)]
                print(f"  First row cells: {first_row}")

inspect(r"F:\order_workflow\商品底价表\出厂底价表.xlsx")
inspect(r"F:\xhs_operator\lead_magnets\2026_外贸出厂核算控制台与批量算价神表_Kelvin旗舰版.xlsx")
