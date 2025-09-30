#!/bin/bash

# Space Biology publications

# This part of the program uses the Entrez Programming 
# Utilities to search and retrieve data from the
# database system at the National Center for Biotechnology
# Information (NCBI). See the full documentation at 
# https://www.ncbi.nlm.nih.gov/books/NBK25501/.

xml_dir="$(dirname "$0")/../../data/xml/sb"
sb_clone_dir="$(dirname "$0")/../../repos/SB_publications"

if [ ! -d "$xml_dir" ]
then
    mkdir -p "$xml_dir"
else
    rm -rf "$xml_dir"
    mkdir -p "$xml_dir"
fi

if [ ! -d "$sb_clone_dir" ]
then
    mkdir -p "$sb_clone_dir"
    git clone https://github.com/jgalazka/SB_publications "$sb_clone_dir"
else
    rm -rf "$sb_clone_dir"
    mkdir -p "$sb_clone_dir"
    git clone https://github.com/jgalazka/SB_publications "$sb_clone_dir"
fi

base="https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
source=$(mlr --csv cut -f Link "$sb_clone_dir"/SB_publication_PMC.csv | tail -n +2)
total=$(mlr --csv cut -f Link "$sb_clone_dir"/SB_publication_PMC.csv | tail -n +2 | wc -l)

cn=0
for publication_url in $source
do
    query=$(echo $publication_url | awk -F/ '{print $6}')
    esearch=$(curl -Ss "${base}/esearch.fcgi?db=pmc&term=${query}&usehistory=y")

    web_env=$(echo "$esearch" | grep -oP '(?<=<WebEnv>)[^<]+' | head -n 1)
    query_key=$(echo "$esearch" | grep -oP '(?<=<QueryKey>)[^<]+' | head -n 1)
    count=$(echo "$esearch" | grep -oP '(?<=<Count>)[0-9]+' | head -n 1)

    efetch_url="https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&WebEnv=${web_env}&query_key=${query_key}&retstart=0&retmax=1&rettype=full&retmode=xml"

    curl -Ss -L -A "Mozilla/5.0" -o "$xml_dir/$query.xml" "$efetch_url"

    # echo $efetch_url
    cn=$((cn+ 1))
    printf "downloaded xml/%-20s (%3d/%d)\n" "$query.xml" "$cn" "$total"
done
