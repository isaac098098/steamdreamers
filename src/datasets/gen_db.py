# This script extracts the PCM identificator,
# title, and tags (keywords or subjects) from
# every xml file in the xml_dir directory. Such 
# directory is expected to be generated with the
# scrapper.sh script in this directory, in order
# to retrieve data from the NCBI.

import os
from pathlib import Path
import xml.etree.ElementTree as ET
import json

base_dir = Path(__file__).resolve().parent
project_root = base_dir.parent.parent

xml_dir = project_root / "data" / "xml" / "sb"
xml_dir.mkdir(parents=True, exist_ok=True)

articles = []

for article in os.listdir(xml_dir):
    if article.endswith(".xml"):
        filepath = os.path.join(xml_dir, article)
        tree = ET.parse(filepath)
        root = tree.getroot()

        print(f"processing {filepath}...")

        # get pcm_id, title and tags of article

        pmc_id_elem = root.find(".//article-meta/article-id")
        pmc_id = "".join(pmc_id_elem.itertext()).strip()

        titl_elem = root.find(".//article-meta/title-group/article-title")
        title = "".join(titl_elem.itertext()).strip()

        subjects = [s.text.lower() for s in root.findall(".//article-meta/article-categories//subject") if s.text and s.text.strip()]
        kwd = [s.text.strip().lower() for s in root.findall(".//article-meta/kwd-group/kwd") if s.text and s.text.strip()]

        art_dict = {
            "pmc_id": pmc_id,
            "title": title
        }

        # choose the array with most tags

        if subjects and kwd:
            if len(subjects) >= len(kwd):
                art_dict["tags"] = subjects
            else:
                art_dict["tags"] = kwd
        elif subjects:
            art_dict["tags"] = subjects
        elif keywords:
            art_dict["tags"] = kwd

        articles.append(art_dict)

# write json database

json_dir = project_root / "data" / "json"
json_dir.mkdir(parents=True, exist_ok=True)

json_file = json_dir / "sb_db.json"

with json_file.open("w", encoding="utf-8") as f:
    json.dump(articles, f, ensure_ascii=False, indent=4)

print(f"processed {len(articles)} files...")
