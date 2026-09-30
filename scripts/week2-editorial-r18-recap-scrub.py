from pathlib import Path

p=Path('netlify/functions/inquirer-week2-editorial-r15.mjs')
self_path=Path('scripts/week2-editorial-r18-recap-scrub.py')
s=p.read_text()
old="""  .replace(/\\breceipts?\\b/gi,'memory');"""
new="""  .replace(/\\breceipts?\\b/gi,'memory')
  .replace(/\\bheadlines?\\b/gi,'results')
  .replace(/\\bback page\\b/gi,'Sunday')
  .replace(/\\bcopy desk\\b/gi,'league')
  .replace(/\\bnewsroom\\b/gi,'league')
  .replace(/\\bpublication\\b/gi,'league')
  .replace(/\\btypeface\\b/gi,'swagger')
  .replace(/\\bscreenshots?\\b/gi,'jokes')
  .replace(/\\bgroup chats?\\b/gi,'rivals')
  .replace(/\\brival chats?\\b/gi,'rivals')
  .replace(/\\brival threads?\\b/gi,'rivals')
  .replace(/\\bmemes?\\b/gi,'mockery')
  .replace(/\\bapps?\\b/gi,'scoreboard');"""
if s.count(old)!=1:
    raise SystemExit(f'recap scrub anchor expected once, found {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s)
self_path.unlink(missing_ok=True)
