# คู่มือทดสอบดึงข้อมูลอุปกรณ์จริง — Aruba 6200F (ArubaOS-CX)

คู่มือนี้ใช้ทดสอบว่าระบบ UP NMS (รันแบบ Local บนเครื่อง) ดึงข้อมูลจาก Switch Aruba 6200F จริงได้หรือไม่

## อ่านก่อนเริ่ม — สำคัญมาก

Aruba 6200F ใช้ **ArubaOS-CX (AOS-CX)** ซึ่งเป็นระบบปฏิบัติการรุ่นใหม่ของ Aruba CLI ต่างจาก
ArubaOS-Switch (รุ่นเก่าอย่าง 2530/2930) และต่างจาก Alcatel AOS โดยสิ้นเชิง ไม่ใช่แค่ syntax
ต่างนิดหน่อย แต่โครงสร้างการเข้าโหมด config ก็ต่างกันด้วย

คำสั่งในคู่มือนี้อ้างอิงจากรูปแบบมาตรฐานของ AOS-CX ที่ใช้กันทั่วไป แต่ไม่ได้ยืนยัน 100% ว่าตรงกับ
firmware version ที่ใช้อยู่จริงเป๊ะทุกตัวอักษร — จากประสบการณ์ตรงที่เจอมากับสวิตช์ยี่ห้ออื่น
(ที่คำสั่งจากคู่มือทั่วไปใช้ไม่ได้ตรงๆ ต้องเช็คทีละจุด) ให้ยึดหลักนี้ตลอดทั้งคู่มือ:

> ก่อนรันคำสั่งที่ไม่คุ้นเคยทุกครั้ง ให้พิมพ์ `<คำสั่งนั้น> ?` หรือกด Tab เพื่อดู autocomplete
> ก่อนเสมอ อย่าพิมพ์คำสั่งเต็มแล้วกด Enter ทันทีถ้ายังไม่เคยเช็ค

---

## ภาพรวม — ทำ 6 เฟสตามลำดับ

| เฟส | ทำอะไร | รันที่ไหน |
|---|---|---|
| 1 | เตรียมเครือข่าย ต่อสาย หา IP | สวิตช์ (Console/SSH) + Mac |
| 2 | เช็ค/ตั้งค่า SNMP บนสวิตช์ | สวิตช์ (Console/SSH) |
| 3 | ทดสอบ SNMP จาก Mac | Mac (Terminal) |
| 4 | เพิ่มอุปกรณ์เข้าระบบ | ไฟล์ `.env` + เว็บ |
| 5 | ยืนยันผลลัพธ์ | Docker log + เว็บ |
| 6 | แก้ปัญหาที่พบบ่อย | อ้างอิงตอนติดปัญหา |

---

## เฟส 1 — เตรียมเครือข่ายให้ Mac คุยกับสวิตช์ได้

### 1.1 เข้าสวิตช์ผ่าน Console

```bash
ls /dev/tty.*
screen /dev/tty.usbserial-XXXX 9600
```

Baud rate เริ่มต้นของ AOS-CX มักเป็น 115200 ไม่ใช่ 9600 แบบ Alcatel ถ้าเข้าไปแล้วเห็นตัวอักษร
เพี้ยน/ไม่มีอะไรขึ้นเลย ให้ลองใหม่ด้วย:

```bash
screen /dev/tty.usbserial-XXXX 115200
```

### 1.2 เช็คสถานะพอร์ตทั้งหมด

```
switch# show interface brief
```

ดูว่าพอร์ตไหน Status = up (มีสายเสียบจริง) เอาสาย LAN ไปเสียบเข้าพอร์ตที่ต้องการใช้ทดสอบ
แล้วรันคำสั่งนี้ซ้ำจนเห็น up

### 1.3 เช็ค Mac ก่อนเสมอ — มีกี่ Network Interface (บทเรียนสำคัญจากรอบก่อน)

ขั้นตอนนี้ต้องทำทุกครั้ง ห้ามข้าม — Mac ที่มี USB-C Hub/Dock อาจมีหลาย interface พร้อมกัน
ทำให้ macOS เลือกเส้นทางผิดไปหาสวิตช์ (เจอปัญหานี้มาแล้วจริงตอนทดสอบสวิตช์ตัวก่อนหน้า):

```bash
ifconfig | grep "inet "
```

จดบันทึก IP ทั้งหมดที่เจอไว้ก่อน แล้วหา interface ที่ต่อสาย USB-Ethernet ไปสวิตช์จริง:

```bash
ifconfig en1
```

ต้องขึ้น `status: active` ตัวที่ `inactive` ไม่ใช่ตัวที่ใช้งานได้จริง

### 1.4 ตั้ง IP ให้สวิตช์ — AOS-CX ใช้ VLAN Interface เป็นหลัก

เข้าโหมด config ก่อนเสมอ (จุดต่างสำคัญจาก Alcatel — AOS-CX ต้อง `configure terminal` ก่อนตั้งค่าทุกอย่าง):

```
switch# configure terminal
switch(config)# interface vlan 1
switch(config-if-vlan)# ip address 10.50.18.60/24
switch(config-if-vlan)# no shutdown
switch(config-if-vlan)# exit
switch(config)# exit
```

เช็คก่อนตั้งจริงด้วย Tab/`?` ถ้าคำสั่งไม่ผ่าน:
```
switch(config)# interface vlan ?
```

เลือก IP ให้ตรง subnet เดียวกับ Mac และต่างจาก IP ที่สวิตช์ตัวก่อนหน้าใช้ไปแล้ว

### 1.5 ยืนยันว่าตั้ง IP สำเร็จ

```
switch# show interface vlan 1
switch# show ip interface brief
```

### 1.6 ทดสอบ ping จาก Mac

```bash
ping 10.50.18.60
```

ถ้า timeout หรือขึ้น "No route to host" กลับไปเช็คข้อ 1.3 ก่อน (สาเหตุอันดับ 1 ที่เจอมาตลอด)

---

## เฟส 2 — เช็ค/ตั้งค่า SNMP บนสวิตช์

### 2.1 เช็คว่าเปิดอยู่แล้วหรือยัง

```
switch# show snmp-server
switch# show snmp community
```

ถ้าเห็น community ที่ต้องการ (เช่น `public`) อยู่แล้วในสถานะ active ข้ามไปเฟส 3 ได้เลย

### 2.2 ถ้ายังไม่มี — ตั้งค่าใหม่

```
switch# configure terminal
switch(config)# snmp-server community public
switch(config)# exit
```

เช็คให้ชัวร์ก่อนว่า syntax ตรง ด้วย:
```
switch(config)# snmp-server ?
```

### 2.3 จุดที่ AOS-CX มักต่างจากสวิตช์ทั่วไป — VRF Context

AOS-CX หลายรุ่นผูก service (รวมถึง SNMP) เข้ากับ VRF (Virtual Routing and Forwarding) ถ้าตั้ง
community แล้วแต่ยังไม่ตอบ ให้เช็คว่าต้องระบุ VRF ด้วยไหม:

```
switch(config)# snmp-server vrf ?
```

ถ้ามี ให้ลองระบุ VRF `default` ชัดเจน:
```
switch(config)# snmp-server vrf default
```

### 2.4 ยืนยันการตั้งค่า

```
switch# show snmp community
switch# show running-config
```

`show running-config` จะโชว์ค่า config ทั้งหมดที่ตั้งไว้จริง มองหาบรรทัดที่มีคำว่า `snmp`
วิธีนี้เชื่อถือได้มากกว่าคำสั่ง `show` เฉพาะทาง เพราะเห็น config ดิบตรงๆ ไม่ผ่านการตีความ

---

## เฟส 3 — ทดสอบ SNMP จาก Mac (ก่อนเอาเข้าระบบเสมอ)

### 3.1 ติดตั้งเครื่องมือ (ถ้ายังไม่มีจากตอนทดสอบสวิตช์ตัวก่อน ข้ามได้)

```bash
brew install net-snmp
```

### 3.2 ทดสอบทีละคำสั่ง

```bash
snmpwalk -v2c -c public 10.50.18.60 sysDescr.0
snmpwalk -v2c -c public 10.50.18.60 1.3.6.1.2.1.25.3.3.1.2
snmpwalk -v2c -c public 10.50.18.60 1.3.6.1.2.1.2.2.1.8
```

ผ่านทั้ง 3 คำสั่ง = พร้อมเอาเข้าระบบจริงได้แล้ว ไปเฟส 4 ต่อ

---

## เฟส 4 — เพิ่มสวิตช์เข้าระบบ UP NMS

### 4.1 เปิด `.env` ที่ root โปรเจกต์

```
SNMP_PROVIDER=real
```

### 4.2 Rebuild backend

```bash
docker compose up -d --build backend
```

### 4.3 เพิ่มอุปกรณ์ผ่านเว็บ

เข้า `http://localhost:3000` แล้ว login เพิ่มโซน (ถ้ายังไม่มี) แล้วเพิ่มอุปกรณ์:
- ประเภท: Switch
- ชื่อ: ตั้งเอง เช่น `SW-ARUBA-01`
- IP Address: `10.50.18.60` (หรือ IP จริงที่ทดสอบผ่าน)
- Brand: `Aruba` / Model: `6200F`

---

## เฟส 5 — ยืนยันว่าดึงข้อมูลจริงได้

### 5.1 ดู log backend ระหว่างรอ

```bash
docker compose logs -f backend
```

### 5.2 รอ 1 รอบ poll (ทุก 5 นาทีตามค่าเริ่มต้น)

### 5.3 เข้าไปดูหน้ารายละเอียดอุปกรณ์

สำเร็จ = สถานะ Online, ค่า CPU/Memory ไม่ใช่ 0, ตารางพอร์ตตรงกับพอร์ตจริงที่มีสายเสียบ

---

## เฟส 6 — ปัญหาที่พบบ่อย

### ปัญหาที่ 1 — ping ไม่ผ่าน / "No route to host"

ดูเฟส 1.3 — สาเหตุอันดับ 1 คือ Mac มีหลาย network interface ที่เลือกเส้นทางผิด วิธีวินิจฉัย:
```bash
route get 10.50.18.60
```
ดูบรรทัด `interface:` ว่าตรงกับตัวที่ต่อสายไปสวิตช์จริงไหม

### ปัญหาที่ 2 — SNMP timeout ทั้งที่ ping ผ่าน

เช็คว่า packet ไปถึงสวิตช์จริงไหมด้วย counter:
```
switch# show snmp-server
```
มองหาตัวเลข request/error counter ถ้ามี เทียบก่อน-หลังยิง `snmpwalk` จาก Mac

ถ้า packet ไปถึงแต่ปฏิเสธ (คล้ายเคส "Bad Community Name" ที่เจอกับสวิตช์ยี่ห้ออื่นมาก่อน):
- เช็คว่า community string ที่ยิงจาก Mac ตรงกับที่ตั้งไว้เป๊ะ (ตัวพิมพ์เล็ก-ใหญ่มีผล)
- เช็คว่ามี ACL/restrict-access ผูกกับ community นั้นอยู่ไหม ด้วย `show snmp community`

### ปัญหาที่ 3 — คำสั่ง config ไม่ผ่าน "Unknown command" หรือ "Invalid input"

อย่าเดา syntax ต่อ ใช้ autocomplete ของ AOS-CX ช่วย (กด Tab ค้าง) — เชื่อถือได้กว่าเดา syntax
จากคู่มือทั่วไป

### ปัญหาที่ 4 — ทดสอบจาก Mac ผ่าน แต่ระบบ UP NMS ยังดึงไม่ได้

ทดสอบจากข้างใน Docker container โดยตรง (Docker มีเครือข่ายแยกจาก Mac):
```bash
docker compose exec backend sh -c "apk add net-snmp-tools && snmpwalk -v2c -c public 10.50.18.60 sysDescr.0"
```

### ปัญหาที่ 5 — ไม่มั่นใจ syntax เฉพาะรุ่น/เวอร์ชัน

อ้างอิงเอกสารทางการ: ค้นหา "ArubaOS-CX 6200 Series Switches Command-Line Reference Guide"
พร้อมระบุเวอร์ชัน firmware ที่ใช้อยู่จริง (เช็คได้ด้วย `show version`) จากเว็บ Aruba/HPE Support
โดยตรง จะได้ syntax ที่ตรง 100% กับรุ่นที่ใช้งานจริง คำสั่งในคู่มือนี้เป็นรูปแบบมาตรฐานทั่วไปของ
AOS-CX เท่านั้น ไม่ได้ยืนยันตรงกับทุก firmware version
