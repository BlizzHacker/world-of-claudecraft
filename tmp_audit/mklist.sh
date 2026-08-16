#!/bin/bash
set -e
cd /opt/cr-realms-store/infernal
md5sum infernal_class_*.glb infernal_human_*.glb | sort > /opt/cryptic-realm/tmp_audit/md5.txt
awk '!seen[$1]++ {print "/opt/cr-realms-store/infernal/" $2}' /opt/cryptic-realm/tmp_audit/md5.txt > /opt/cryptic-realm/tmp_audit/uniq.txt
grep -v 'infernal_class_amazon' /opt/cryptic-realm/tmp_audit/uniq.txt > /opt/cryptic-realm/tmp_audit/todo.txt
cd /opt/cryptic-realm/tmp_audit
rm -f chunk_*
split -l 4 -d todo.txt chunk_
wc -l uniq.txt todo.txt
ls chunk_*
