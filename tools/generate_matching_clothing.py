#!/usr/bin/env python3
"""Generate 50 character-matched tops + 50 bottoms for the 32x32 BAI avatar.

The previous extra clothing was sourced from a different 40x46 character rig.
This generator instead paints new pixel-art layers directly against the game's
32x32 character silhouettes, per animation pose and direction.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
AV=ROOT/'public/assets/avatar'
FRAME=32
STATES={'Idle':4,'Walk':4,'Run':4,'Jump':3,'Hurt':3,'Interact':3,'Punch':5,'Sword':5}
DIRS=('Front','Back','Left','Right')
TOP_TARGET=79
BOTTOM_TARGET=64

TOP_PALETTES=[
 ('red', '#d94848','#9f2934','#f36b5f','#ffd1c7'),('blue','#3f72c8','#27478c','#6fa2f3','#dceaff'),
 ('green','#3f9b63','#24613f','#70c98b','#d9f3df'),('purple','#8a5bc7','#583582','#b78ce8','#efe2ff'),
 ('orange','#e58a32','#9b4f1e','#f6b45f','#fff0d2'),('yellow','#d7b83f','#8d7622','#f2d66d','#fff7cf'),
 ('pink','#d75c9a','#8d315f','#ee8fc0','#ffe0ef'),('cyan','#36a9b8','#1f6872','#68d1dc','#d9fbff'),
 ('navy','#314c78','#202f50','#5877a8','#d9e4f8'),('brown','#8b5d3b','#543522','#b77d50','#f1d0ae'),
]
BOTTOM_PALETTES=[
 ('denim','#3e5f9a','#263b67','#6f91c9','#dbe7ff'),('black','#34343e','#1f1f27','#5a5a68','#d9d9e3'),
 ('olive','#68783f','#3d4726','#8e9f5a','#e4ebc9'),('khaki','#a98d5c','#6f5c39','#c8ae7b','#f4e7c7'),
 ('red','#9f3f48','#662731','#d5656d','#ffd9dc'),('purple','#634c93','#3e2f62','#8c72c1','#e8dcff'),
 ('teal','#397f84','#24575b','#5eb0b5','#d8f5f6'),('orange','#b96b35','#74401f','#df9150','#ffe2c8'),
 ('pink','#a74f78','#6b3150','#d27aa0','#ffe1ef'),('blue','#406f86','#294b5a','#6fa8bf','#d9f0f8'),
]

# 50 distinct top designs, grouped by silhouette/style.
TOP_STYLES=['tee','stripe','polo','hoodie','jacket','varsity','sweater','vest','button','sport']*5
# 50 distinct bottom designs.
BOTTOM_STYLES=['jeans','chinos','shorts','cargo','skirt','sport','wide','rolled','panel','utility']*5


def hexrgb(h):
 h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))

def mask_for(state,direction,frame_idx,region):
 p=AV/state/'Character'/f'Character_{state}_{direction}-Sheet.png'
 im=Image.open(p).convert('RGBA')
 frame=im.crop((frame_idx*FRAME,0,frame_idx*FRAME+FRAME,FRAME))
 # alpha is the body's silhouette. Limit to torso/legs region.
 a=frame.getchannel('A')
 out=Image.new('1',(FRAME,FRAME),0)
 lo,hi=region
 for y in range(lo,hi+1):
  for x in range(FRAME):
   if a.getpixel((x,y))>0: out.putpixel((x,y),1)
 return out

def clipped(layer,mask):
 alpha=layer.getchannel('A')
 # combine alpha with body mask
 alpha=Image.composite(alpha,Image.new('L',layer.size,0),mask)
 layer.putalpha(alpha)
 return layer

def draw_top(idx,style,pal,direction,state,frame_idx):
 name,c0,c1,c2,c3=pal; base=hexrgb(c0); dark=hexrgb(c1); hi=hexrgb(c2); light=hexrgb(c3)
 im=Image.new('RGBA',(FRAME,FRAME),(0,0,0,0)); d=ImageDraw.Draw(im)
 side=direction in ('Left','Right')
 # Main shirt silhouette follows the character torso. Slightly different width for side view.
 if side: body=(11,11,20,20); sleeveL=(9,14,12,19); sleeveR=(19,14,22,19)
 else: body=(8,11,23,20); sleeveL=(5,14,10,20); sleeveR=(21,14,26,20)
 def rect(box,fill): d.rectangle(box,fill=fill)
 def line(xy,fill): d.line(xy,fill=fill,width=1)
 # base torso
 rect(body,dark)
 rect((body[0]+1,body[1]+1,body[2]-1,body[3]),base)
 # sleeves according to style
 if style not in ('vest','sport'):
  rect(sleeveL,dark); rect((sleeveL[0]+1,sleeveL[1],sleeveL[2],sleeveL[3]-1),base)
  rect(sleeveR,dark); rect((sleeveR[0],sleeveR[1],sleeveR[2]-1,sleeveR[3]-1),base)
 # neck / collar details
 if style=='tee':
  rect((13,11,18,12),dark); rect((14,11,17,11),light)
 elif style=='stripe':
  for y in range(13,20,3): rect((body[0]+1,y,body[2]-1,y+1),hi)
  rect((13,11,18,12),dark)
 elif style=='polo':
  rect((13,11,18,12),light); rect((14,12,17,15),dark); rect((15,12,16,14),light)
  line((9,16,22,16),hi)
 elif style=='hoodie':
  rect((12,10,19,12),dark); rect((13,11,18,12),hi); rect((14,14,17,18),dark); rect((15,14,16,17),light)
 elif style=='jacket':
  rect((9,12,22,20),dark); rect((10,13,21,19),base); line((15,12,15,19),hi); line((16,12,16,19),dark)
 elif style=='varsity':
  rect((9,12,22,20),dark); rect((10,13,21,19),base); line((15,13,15,19),light)
  rect((11,14,13,16),hi); rect((18,14,20,16),hi)
 elif style=='sweater':
  rect((10,12,21,19),base)
  for y in (14,17): line((10,y,21,y),hi)
  rect((13,11,18,12),dark)
 elif style=='vest':
  rect((9,13,22,20),dark); rect((11,14,13,19),base); rect((18,14,20,19),base); rect((14,13,17,20),light)
 elif style=='button':
  rect((9,12,22,20),base); line((15,12,15,20),dark); line((16,12,16,20),light)
  for y in (14,17,19): rect((15,y,15,y),light)
 elif style=='sport':
  rect((9,12,22,20),base); rect((10,14,21,15),hi); rect((13,12,18,13),light)
 # 5th cycle adds a unique graphic/trim by idx
 cycle=idx%5
 if cycle==1:
  rect((12,16,13,18),light); rect((18,16,19,18),light)
 elif cycle==2:
  rect((14,16,17,18),hi); rect((15,17,16,17),light)
 elif cycle==3:
  line((11,18,20,18),dark)
 elif cycle==4:
  rect((12,13,13,14),light); rect((18,13,19,14),light)
 # mask to body region; y 10-21 catches shoulders/torso only.
 return clipped(im,mask_for(state,direction,frame_idx,(10,21)))

def draw_bottom(idx,style,pal,direction,state,frame_idx):
 name,c0,c1,c2,c3=pal; base=hexrgb(c0); dark=hexrgb(c1); hi=hexrgb(c2); light=hexrgb(c3)
 im=Image.new('RGBA',(FRAME,FRAME),(0,0,0,0)); d=ImageDraw.Draw(im)
 side=direction in ('Left','Right')
 if side: body=(11,18,20,28)
 else: body=(8,18,23,29)
 def rect(box,fill): d.rectangle(box,fill=fill)
 def line(xy,fill): d.line(xy,fill=fill,width=1)
 # base lower-body silhouette
 rect(body,dark); rect((body[0]+1,body[1]+1,body[2]-1,body[3]),base)
 if style=='jeans':
  line((15,20,15,28),hi); line((16,20,16,28),dark)
  rect((10,19,13,20),hi); rect((18,19,21,20),hi)
 elif style=='chinos':
  rect((10,19,21,20),hi); line((15,20,15,28),dark)
 elif style=='shorts':
  rect((9,18,22,24),base); rect((9,23,14,25),dark); rect((17,23,22,25),dark); line((15,20,15,24),dark)
 elif style=='cargo':
  rect((9,19,22,28),base); rect((9,22,12,24),hi); rect((19,22,22,24),hi); line((15,20,15,28),dark)
 elif style=='skirt':
  rect((8,18,23,24),base); rect((7,22,24,26),dark); rect((8,23,23,25),base); line((11,23,11,25),hi); line((20,23,20,25),hi)
 elif style=='sport':
  rect((9,19,22,26),base); rect((9,21,22,22),hi); rect((15,20,15,28),dark)
 elif style=='wide':
  rect((8,18,23,28),base); rect((9,20,22,21),hi); line((14,21,14,28),dark); line((17,21,17,28),dark)
 elif style=='rolled':
  rect((9,19,22,28),base); rect((9,26,14,27),hi); rect((17,26,22,27),hi); line((15,20,15,28),dark)
 elif style=='panel':
  rect((9,19,22,28),base); rect((11,20,13,27),hi); rect((18,20,20,27),hi); line((15,20,15,28),dark)
 elif style=='utility':
  rect((9,19,22,28),base); rect((10,22,13,25),hi); rect((18,22,21,25),hi); rect((14,19,17,20),light)
 cycle=idx%5
 if cycle==1: line((10,24,13,24),light)
 elif cycle==2: rect((12,19,13,20),light); rect((18,19,19,20),light)
 elif cycle==3: line((10,26,13,26),dark); line((18,26,21,26),dark)
 elif cycle==4: rect((15,22,16,23),light)
 return clipped(im,mask_for(state,direction,frame_idx,(18,30)))

def build(category,target,styles,palettes):
 for state,frames in STATES.items():
  for direction in DIRS:
   token='Tops' if category=='tops' else 'Bottoms'
   p=AV/state/'Clothing'/f'Clothing_{token}_{state}_{direction}-Sheet.png'
   if not p.exists(): continue
   src=Image.open(p).convert('RGBA')
   old=src.height//FRAME
   out=Image.new('RGBA',(src.width,FRAME*target),(0,0,0,0)); out.alpha_composite(src,(0,0))
   start=old
   count=target-start
   for row in range(start,target):
    idx=row-start
    style=styles[idx%len(styles)]
    pal=palettes[idx%len(palettes)]
    for f in range(frames):
     layer=draw_top(idx,style,pal,direction,state,f) if category=='tops' else draw_bottom(idx,style,pal,direction,state,f)
     out.alpha_composite(layer,(f*FRAME,row*FRAME))
   out.save(p)
   print(f'{p.relative_to(ROOT)}: {old}->{target}')

if __name__=='__main__':
 build('tops',TOP_TARGET,TOP_STYLES,TOP_PALETTES)
 build('bottoms',BOTTOM_TARGET,BOTTOM_STYLES,BOTTOM_PALETTES)
