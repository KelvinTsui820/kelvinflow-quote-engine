# -*- coding: utf-8 -*-
import zipfile
import xml.etree.ElementTree as ET
import sys

sys.stdout.reconfigure(encoding='utf-8')

def analyze_file(path, label):
    print("=" * 70)
    print(f"ANALYZING [{label}]: {path}")
    with zipfile.ZipFile(path, 'r') as z:
        wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        sheets = wb_tree.findall('.//ns:sheet', ns)
        print(f"Total Sheets: {len(sheets)}")
        for s in sheets:
            print(f"  - Sheet Name: {s.attrib.get('name')}")
            
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('.//ns:si', ns):
                shared_strings.append(''.join(si.itertext()))
                
        rels_tree = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rel_ns = {'r': 'http://schemas.openxmlformats.org/package/2006/relationships'}
        id_to_target = {r.attrib.get('Id'): r.attrib.get('Target') for r in rels_tree.findall('.//r:Relationship', rel_ns)}
        
        for s in sheets:
            s_name = s.attrib.get('name')
            r_id = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            target = 'xl/' + id_to_target[r_id].replace('\\', '/')
            stree = ET.fromstring(z.read(target))
            rows = stree.findall('.//ns:row', ns)
            formulas = []
            for r in rows:
                for c in r.findall('ns:c', ns):
                    f = c.find('ns:f', ns)
                    if f is not None:
                        formulas.append((c.attrib.get('r'), f.text))
            cols = stree.findall('.//ns:col', ns)
            header_cells = []
            if rows:
                for c in rows[0].findall('ns:c', ns):
                    v = c.find('ns:v', ns)
                    t = c.attrib.get('t')
                    txt = ''
                    if v is not None:
                        txt = shared_strings[int(v.text)] if t == 's' else v.text
                    header_cells.append(f"{c.attrib.get('r')}: {txt}")
            print(f"  Sheet '{s_name}': {len(rows)} rows, {len(cols)} col definitions, {len(formulas)} formulas")
            if 'Products' in s_name or '商品' in s_name:
                print(f"    Product Header Cols Count: {len(header_cells)}")
                for h in header_cells:
                    print(f"       {h}")
                print(f"    Formulas in Products Sheet: {len(formulas)}")
                for f_cell, f_txt in formulas[:6]:
                    print(f"       Formula {f_cell}: {f_txt}")
            if '对外' in s_name or '报价单' in s_name:
                print(f"    Quote Header Cols Count: {len(header_cells)}")
                print(f"    Formulas in Quote Sheet: {len(formulas)}")
                for f_cell, f_txt in formulas[:6]:
                    print(f"       Formula {f_cell}: {f_txt}")

if __name__ == '__main__':
    analyze_file(r"F:\order_workflow\商品底价表\出厂底价表.xlsx", "ORIGINAL_CORE (出厂底价表.xlsx)")
    analyze_file(r"F:\xhs_operator\lead_magnets\2026_外贸出厂核算控制台与批量算价神表_Kelvin旗舰版_新对齐.xlsx", "FLAGSHIP_NEW (旗舰版_新对齐.xlsx)")
