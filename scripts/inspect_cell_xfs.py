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
    fills = styles_tree.findall('.//ns:fills/ns:fill', ns)
    cell_xfs = styles_tree.findall('.//ns:cellXfs/ns:xf', ns)
    
    print(f"Total cellXfs: {len(cell_xfs)}")
    for i, xf in enumerate(cell_xfs):
        fId = int(xf.attrib.get('fontId', 0))
        fillId = int(xf.attrib.get('fillId', 0))
        numFmtId = xf.attrib.get('numFmtId', '0')
        applyAlign = xf.attrib.get('applyAlignment')
        align = xf.find('ns:alignment', ns)
        align_str = ""
        if align is not None:
            align_str = f"h={align.attrib.get('horizontal')}, v={align.attrib.get('vertical')}"
        
        # describe font
        f = fonts[fId] if fId < len(fonts) else None
        fname = f.find('ns:name', ns).attrib.get('val') if f and f.find('ns:name', ns) is not None else ''
        fsz = f.find('ns:sz', ns).attrib.get('val') if f and f.find('ns:sz', ns) is not None else ''
        fbold = f.find('ns:b', ns) is not None if f else False
        fcol = f.find('ns:color', ns).attrib if f and f.find('ns:color', ns) is not None else {}
        
        # describe fill
        fill = fills[fillId] if fillId < len(fills) else None
        pfill = fill.find('ns:patternFill', ns) if fill else None
        fg = pfill.find('ns:fgColor', ns).attrib if pfill and pfill.find('ns:fgColor', ns) is not None else {}
        
        print(f"xf {i}: font({fId}, {fname}, {fsz}pt, bold={fbold}, {fcol}), fill({fillId}, fg={fg}), numFmt={numFmtId}, align={align_str}")
