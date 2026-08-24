import json, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'data.json').read_text(encoding='utf-8'))
errors=[]
placements={}
for cat in manifest.get('categories',[]):
    for ref in cat.get('skills',[]):
        placements.setdefault(ref,[]).append(cat['id'])
        if not (root/'skills'/(ref+'.json')).exists(): errors.append(f'Missing shared skill: {ref}')
for ref in manifest.get('featured',[]):
    if len(placements.get(ref,[])) != 1: errors.append(f'Featured skill must occur in exactly one category: {ref} -> {placements.get(ref,[])}')
    p=root/'skills'/(ref+'.json')
    if p.exists():
        skill=json.loads(p.read_text(encoding='utf-8'))
        f=skill.get('featured')
        if not f: errors.append(f'Featured skill lacks featured presentation: {ref}')
        elif len(f.get('supportingImages',[])) != 3: errors.append(f'Featured skill needs exactly 3 supporting images: {ref}')
if errors:
    print('\n'.join('ERROR: '+x for x in errors)); sys.exit(1)
print(f"OK: {len(manifest.get('categories',[]))} categories, {sum(len(c.get('skills',[])) for c in manifest.get('categories',[]))} skills, {len(manifest.get('featured',[]))} featured")
