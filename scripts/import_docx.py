#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
初中英语题库平台 - 批量 Word (.docx) 题目自动化导入与插图提取管线
使用方式:
    python3 scripts/import_docx.py --file "九上语法选择.docx" --grade "九年级" --sem "九年级上册" --type "语法选择"
"""

import os
import sys
import re
import json
import zipfile
import argparse
import xml.etree.ElementTree as ET

CN_NUMS = [
    '一','二','三','四','五','六','七','八','九','十',
    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
    '二十一','二十二','二十三','二十四','二十五','二十六','二十七','二十八','二十九','三十'
]

def is_explanation(p):
    if not p:
        return False
    keywords = [
        '句意', '根据“', '故选', '固定搭配', '表特指', '表泛指', '固定结构', '；',
        '动词原形', '过去式', '比较级', '最高级', '副词', '形容词', '名词', '代词', '介词'
    ]
    if re.match(r'^\d+[\.．]', p):
        return True
    return any(kw in p for kw in keywords)

def split_opts(line):
    m = re.match(r'^\d+[\.．]\s*(.*)$', line)
    if not m:
        return []
    rest = m.group(1).strip()
    parts = re.split(r'[A-D][\.．]\s*', rest)
    return [p.strip() for p in parts[1:] if p.strip()]

def parse_docx(file_path, grade, sem, q_type, id_prefix, img_dir):
    with zipfile.ZipFile(file_path, 'r') as z:
        doc_xml = z.read('word/document.xml')
        try:
            rels_xml = z.read('word/_rels/document.xml.rels')
            rels_tree = ET.fromstring(rels_xml)
            rel_map = {r.attrib.get('Id'): r.attrib.get('Target') for r in rels_tree}
        except Exception:
            rel_map = {}

    tree = ET.fromstring(doc_xml)
    namespaces = {
        'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    }

    # 读取段落与段落内包含的图片关系
    p_nodes = list(tree.iterfind('.//w:p', namespaces))
    paragraphs = []
    p_images = []  # 每个段落关联的图片文件名列表

    with zipfile.ZipFile(file_path, 'r') as z:
        for idx, p in enumerate(p_nodes):
            text = (''.join(p.itertext())).strip()
            paragraphs.append(text)
            
            # 检测该段落中的图片
            xml_str = ET.tostring(p, encoding='utf-8').decode('utf-8')
            r_ids = re.findall(r'r:embed=\"([^\"]+)\"', xml_str)
            imgs = []
            for rid in r_ids:
                target = rel_map.get(rid, '')
                if target.startswith('media/'):
                    target = 'word/' + target
                if target in z.namelist():
                    imgs.append((rid, target, z.read(target)))
            p_images.append(imgs)

    ans_indices = [i for i, p in enumerate(paragraphs) if '【答案】' in p]
    if not ans_indices:
        print('未在文档中检测到【答案】标记。')
        return []

    print(f'在文档中检测到 {len(ans_indices)} 个题组。开始解析...')

    parsed_items = []
    for i, ans_idx in enumerate(ans_indices):
        opt_lines_idx = []
        j = ans_idx - 1
        while j >= 0 and len(opt_lines_idx) < 10:
            p = paragraphs[j]
            if re.match(r'^\d+[\.．]\s*[A-D][\.．]', p):
                opt_lines_idx.insert(0, j)
            j -= 1
        if not opt_lines_idx:
            continue
        opt_start = opt_lines_idx[0]

        # 逆向搜集篇章段落
        passage_paras_indices = []
        k = opt_start - 1
        while k >= 0:
            p = paragraphs[k]
            if not p and not p_images[k]:
                k -= 1
                continue
            if not is_explanation(p) and (len(p) > 20 or p_images[k]):
                if not re.match(r'^[请阅通]*读下面短文', p):
                    passage_paras_indices.insert(0, k)
                k -= 1
            else:
                break

        # 答案行解析
        ans_line = paragraphs[ans_idx + 1] if ans_idx + 1 < len(paragraphs) else ''
        ans_matches = re.findall(r'(\d+)[\.．]\s*([A-D])', ans_line)

        # 难度系数、来源与导语
        diff_val = 2
        intro_val = ''
        for k in range(ans_idx + 1, min(len(paragraphs), ans_idx + 10)):
            p = paragraphs[k].strip()
            if '【难度】' in p:
                v = p.replace('【难度】', '').strip()
                try:
                    dv = float(v)
                    diff_val = 1 if dv >= 0.85 else (3 if dv < 0.6 else 2)
                except Exception:
                    diff_val = 2
            elif '【导语】' in p:
                intro_val = p.replace('【导语】', '').strip()

        # 详解解析
        exp_paras = []
        start_collecting = False
        for k in range(ans_idx + 1, min(len(paragraphs), ans_idx + 45)):
            p = paragraphs[k].strip()
            if '【详解】' in p:
                start_collecting = True
                rem = p.replace('【详解】', '').strip()
                if rem:
                    exp_paras.append(rem)
                continue
            if not start_collecting and re.match(r'^\d+[\.．]\s*句意', p):
                start_collecting = True
                exp_paras.append(p)
                continue
            if start_collecting:
                if re.match(r'^\d+[\.．]\s*[A-D][\.．]', p) or (re.match(r'^[A-Z][a-zA-Z\s,]+', p) and len(p) > 40 and not re.search(r'[\u4e00-\u9fa5]', p[:20])):
                    break
                if p:
                    exp_paras.append(p)

        q_exps = {}
        cur_q = None
        cur_lines = []
        for p in exp_paras:
            m = re.match(r'^(\d+)[\.．]', p)
            if m:
                if cur_q is not None:
                    q_exps[cur_q] = '\n'.join(cur_lines)
                cur_q = int(m.group(1))
                cur_lines = [re.sub(r'^\d+[\.．]\s*', '', p)]
            else:
                if cur_q is not None:
                    cur_lines.append(p)
        if cur_q is not None:
            q_exps[cur_q] = '\n'.join(cur_lines)

        qid = f'{id_prefix}{i+1}'
        q_nums = [int(m[0]) for m in ans_matches]

        # 篇章排版与段落插图保存
        pass_text_paras = []
        pass_html_paras = []
        img_counter = 0

        for p_idx in passage_paras_indices:
            pt = paragraphs[p_idx]
            pht = pt
            for idx_in_set, qn in enumerate(q_nums):
                pat = r'(\s{2,}|_{2,})\s*' + str(qn) + r'\s*(\s{2,}|_{2,})'
                pt = re.sub(pat, f' ___{(idx_in_set+1)}___ ', pt)
                pht = re.sub(pat, f' <u>&nbsp;&nbsp;{idx_in_set+1}&nbsp;&nbsp;</u> ', pht)

            # 保存段落内的插图
            for _, img_target, raw_bytes in p_images[p_idx]:
                img_counter += 1
                ext = os.path.splitext(img_target)[1].lower() or '.png'
                img_fname = f'{qid}_{img_counter}{ext}'
                img_fpath = os.path.join(img_dir, img_fname)
                with open(img_fpath, 'wb') as img_out:
                    img_out.write(raw_bytes)
                img_tag = f'<p class="ct"><img src="assets/images/{img_fname}" alt="插图" width="200"></p>'
                pht += img_tag

            if pt:
                pass_text_paras.append(pt)
            if pht:
                pass_html_paras.append(f'<p><span class="ind">{pht}</span></p>')

        passage = '\n'.join(pass_text_paras)
        passageHtml = ''.join(pass_html_paras)

        # 选项
        qs = []
        for idx_in_set, qn in enumerate(q_nums):
            opt_line = paragraphs[opt_lines_idx[idx_in_set]]
            opts = split_opts(opt_line)
            ans = ans_matches[idx_in_set][1]
            exp = q_exps.get(qn, '')
            qs.append({
                'q': f'({idx_in_set+1})',
                'opts': opts,
                'ans': ans,
                'exp': exp
            })

        theme = ''
        if intro_val:
            m_intro = re.search(r'本文(?:主要)?(?:讲述|介绍|讲述了|介绍了|通过)(?:了)?([^，。]{2,15})', intro_val)
            if m_intro:
                theme = m_intro.group(1).strip()
                theme = re.sub(r'的故事|的生平事迹|的经历|的来历', '', theme)
        if not theme or len(theme) < 2:
            num_str = CN_NUMS[i] if i < len(CN_NUMS) else str(i+1)
            theme = f'篇目{num_str}'

        num_str = CN_NUMS[i] if i < len(CN_NUMS) else str(i+1)
        sem_short = sem.replace('年级', '').replace('册', '')
        title = f'{sem_short}{q_type} · {num_str} {theme}'

        kp = ['记叙文', sem]
        if '说明文' in intro_val:
            kp[0] = '说明文'
        if '寓言' in intro_val:
            kp.insert(1, '寓言故事')

        parsed_items.append({
            'id': qid,
            'stage': 'junior',
            'type': q_type,
            'diff': diff_val,
            'kp': kp,
            'title': title,
            'passage': passage,
            'passageHtml': passageHtml,
            'intro': intro_val,
            'qs': qs
        })

    return parsed_items

def main():
    parser = argparse.ArgumentParser(description='批量解析 Word (.docx) 题目并自动提取插图导入平台')
    parser.add_argument('--file', required=True, help='待导入的 .docx 试卷文件路径')
    parser.add_argument('--grade', default='九年级', help='年级（如：七年级、八年级、九年级）')
    parser.add_argument('--sem', default='九年级上册', help='学期（如：九年级上册）')
    parser.add_argument('--type', default='语法选择', help='题型（如：语法选择、完形填空、阅读理解）')
    parser.add_argument('--id-prefix', default='jr_gram9a_', help='题目ID前缀')
    parser.add_argument('--data-file', default='js/data.js', help='题库数据文件路径')
    parser.add_argument('--assets-dir', default='assets/images', help='插图保存目录')

    args = parser.parse_args()

    os.makedirs(args.assets_dir, exist_ok=True)

    items = parse_docx(
        file_path=args.file,
        grade=args.grade,
        sem=args.sem,
        q_type=args.type,
        id_prefix=args.id_prefix,
        img_dir=args.assets_dir
    )

    print(f'成功解析得到 {len(items)} 个标准化题组！')

    if os.path.exists(args.data_file):
        with open(args.data_file, 'r', encoding='utf-8') as f:
            c = f.read()
        p_end = c.find('const SAMPLE=')
        if p_end == -1:
            p_end = c.find('const SAMPLE =')
        prefix = c[:p_end]
        s_arr = c.find('[', p_end)
        e_arr = c.rfind(']') + 1
        existing = json.loads(c[s_arr:e_arr])
        
        # 按 ID 去重合并
        existing_ids = {x['id'] for x in items}
        merged = [x for x in existing if x['id'] not in existing_ids] + items
        new_content = prefix + 'const SAMPLE=' + json.dumps(merged, ensure_ascii=False, indent=2) + ';\n'
        with open(args.data_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'已同步更新至 {args.data_file}，题库总量现有 {len(merged)} 组。')

if __name__ == '__main__':
    main()
