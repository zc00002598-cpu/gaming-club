"""
生成图标文件（输出到当前目录）
"""
import struct, zlib, os, sys

OUT = os.path.join(os.path.dirname(__file__), "assets")
os.makedirs(OUT, exist_ok=True)

W, H = 256, 256
cx, cy = W//2, H//2

def lerp_color(c1, c2, t):
    return tuple(int(c1[i]+(c2[i]-c1[i])*t) for i in range(4))

BG    = (10, 10, 15, 255)
PURP  = (124, 58, 237, 255)
PINK_ = (219, 39, 119, 255)
WHITE = (255, 255, 255, 255)
TRANS = (0,0,0,0)

# 盾牌参数
shcx,shcy = cx, cy-5
shw,shh = 110,130

def in_rr(x,y,r=45):
    lx,ly = abs(x-cx),abs(y-cy)
    w2,h2 = W//2-1,H//2-1
    if lx>w2 or ly>h2: return False
    cx2,cy2 = w2-r,h2-r
    if lx<=cx2 or ly<=cy2: return True
    return (lx-cx2)**2+(ly-cy2)**2 <= r*r

def shield_color(x,y):
    dx,dy = x-shcx, y-shcy
    mid_rel = shh//6
    tip_rel = shh//2+10
    ell_h = shh//2+shh//6
    if dy <= mid_rel:
        if ell_h==0: return None
        if (dx/shw)**2+((dy+shh//2)/ell_h)**2 > 1.0: return None
    else:
        ratio = (dy-mid_rel)/(tip_rel-mid_rel)
        ratio = max(0.0,min(1.0,ratio))
        if abs(dx) > shw*(1-ratio): return None
    t = max(0.0,min(1.0,(x-(shcx-shw))/(shw*2)))
    return lerp_color(PURP, PINK_, t)

def in_check(x,y,thick=13):
    p1,p2,p3 = (cx-32,cy+5),(cx-7,cy+32),(cx+40,cy-25)
    def ds(px,py,ax,ay,bx,by):
        dx,dy = bx-ax,by-ay
        if not dx and not dy: return ((px-ax)**2+(py-ay)**2)**.5
        t=max(0.0,min(1.0,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)))
        return ((px-(ax+t*dx))**2+(py-(ay+t*dy))**2)**.5
    return min(ds(x,y,*p1,*p2),ds(x,y,*p2,*p3))<=thick

pixels = []
for row in range(H):
    rp = []
    for col in range(W):
        if not in_rr(col,row): rp.append(TRANS); continue
        sc = shield_color(col,row)
        if sc:
            rp.append(WHITE if in_check(col,row) else sc)
        else:
            t = (col+row)/(W+H)
            rp.append(lerp_color(BG,(13,11,38,255),t))
    pixels.append(rp)

def png(px,w,h):
    def chunk(n,d):
        c=zlib.crc32(n+d)&0xFFFFFFFF
        return struct.pack('>I',len(d))+n+d+struct.pack('>I',c)
    raw = b''.join(b'\x00'+bytes(c for p in row for c in p) for row in px)
    data = b'\x89PNG\r\n\x1a\n'
    data += chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))
    data += chunk(b'IDAT',zlib.compress(raw,9))
    data += chunk(b'IEND',b'')
    return data

png_data = png(pixels,W,H)
with open(os.path.join(OUT,"icon.png"),'wb') as f: f.write(png_data)
print("icon.png OK")

def ico(png_data):
    h=struct.pack('<HHH',0,1,1)
    de=struct.pack('<BBBBHHII',0,0,0,0,1,32,len(png_data),6+16)
    return h+de+png_data

with open(os.path.join(OUT,"icon.ico"),'wb') as f: f.write(ico(png_data))
print("icon.ico OK")
