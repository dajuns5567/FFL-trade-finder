from pathlib import Path

path = Path('netlify/functions/inquirer-week2-editorial-r15.mjs')
text = path.read_text()


def replace_second(src, old, new):
    count = src.count(old)
    if count != 2:
        raise SystemExit(f'Expected exactly two duplicate result templates, found {count}: {old}')
    first = src.index(old)
    second = src.index(old, first + len(old))
    return src[:second] + new + src[second + len(old):]


old_win = "   'A '+token+' win over '+op+' put '+tm+' at '+rec+'.',"
new_win = "   tm+' used a '+token+' win over '+op+' to move the record to '+rec+'.',"
text = replace_second(text, old_win, new_win)

old_loss = "   'A '+token+' defeat against '+op+' put '+tm+' at '+rec+'.',"
new_loss = "   tm+' came out of a '+token+' loss to '+op+' with the record at '+rec+'.',"
text = replace_second(text, old_loss, new_loss)

if text.count(new_win) != 1 or text.count(new_loss) != 1:
    raise SystemExit('Reporter-specific result replacements did not land exactly once')

path.write_text(text)
