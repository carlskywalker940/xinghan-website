import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1] / 'reports/v2'
timeline=json.loads((root/'capture-timeline.json').read_text())
records={r['name']:r for r in timeline if 'samples' in r}
def sequence(name, crop=None, width=960):
 files=sorted((root/'frames').glob(name+'-*.png')); rec=records[name]
 images=[]
 for f in files:
  im=Image.open(f).convert('RGB')
  if crop: im=im.crop(crop)
  im.thumbnail((width,2000),Image.Resampling.LANCZOS)
  images.append(im)
 ts=rec['samples'];durations=[max(40,ts[i+1]-ts[i]) for i in range(len(ts)-1)]+[max(80,rec['duration']-ts[-1])]
 return images,durations
def save(name,frames,durations):
 sheet=Image.new('RGB',(160,len(frames)*100))
 for i,frame in enumerate(frames):
  tile=frame.copy();tile.thumbnail((160,100));sheet.paste(tile,(0,i*100))
 palette=sheet.quantize(colors=192)
 frames=[im.quantize(palette=palette,dither=Image.Dither.NONE) for im in frames]
 frames[0].save(root/(name+'.gif'),save_all=True,append_images=frames[1:],duration=durations,loop=0,optimize=True,disposal=2)
 print(name,len(frames),'frames',sum(durations),'ms')
for name in ['environment','forward','reverse']:
 save(name,*sequence(name))
save('wall-detail',*sequence('environment',crop=(1255,100,1440,540),width=370))
save('navigation',*sequence('navigation',crop=(1000,35,1280,135),width=560))
a,ta=sequence('font-open',crop=(135,325,455,430),width=640)
b,tb=sequence('font-close',crop=(135,325,455,430),width=640)
ta[-1]+=600;tb[-1]+=600
save('font-menu',a+b,ta+tb)
