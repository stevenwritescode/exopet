#!/bin/bash
# Provision the ExoPet HAT ID EEPROM (CAT24C32 on the HAT's ID pins).
# Run ON the Pi wearing the HAT:  sudo ./provision-hat.sh [--if-blank]
#
# --if-blank: exit 0 quietly if the HAT already identifies (for use as
#             a boot-time hook; makes provisioning zero-touch).
#
# Requires: JP2 open (factory default — closing it write-protects).
set -e
cd "$(dirname "$0")"

if [ "$(id -u)" != 0 ]; then echo "run with sudo"; exit 1; fi

if [ "$1" = "--if-blank" ] && [ -e /proc/device-tree/hat/product ]; then
    echo "HAT already provisioned: $(tr -d '\0' </proc/device-tree/hat/product)"
    exit 0
fi

# ── tools ──────────────────────────────────────────────────────
if [ ! -x ./eepmake ]; then
    echo "── building eepromutils ──"
    apt-get install -y -qq git build-essential device-tree-compiler >/dev/null
    rm -rf /tmp/hats && git clone -q --depth 1 https://github.com/raspberrypi/hats /tmp/hats
    make -s -C /tmp/hats/eepromutils
    cp /tmp/hats/eepromutils/eepmake /tmp/hats/eepromutils/eepdump .
    cp /tmp/hats/eepromutils/eepflash.sh .
    chmod +x eepflash.sh
fi

# ── build image: settings + device-tree overlay ────────────────
echo "── compiling DT overlay + EEPROM image ──"
dtc -@ -q -I dts -O dtb -o exopet-hat.dtbo exopet-hat.dts
./eepmake eeprom_settings.txt exopet-hat.eep exopet-hat.dtbo >/dev/null
echo "image: $(stat -c%s exopet-hat.eep) bytes"

# ── flash over the ID pins (GPIO0/1) via a temporary gpio bus ──
# eepflash.sh's at24+dd method hangs on current kernels; write the
# pages directly with i2ctransfer (CAT24C32: 32-byte pages, 2-byte
# addresses). Verified working on rev 1 hardware 2026-08-06.
echo "── flashing ──"
command -v i2ctransfer >/dev/null || apt-get install -y -qq i2c-tools >/dev/null
dtoverlay i2c-gpio i2c_gpio_sda=0 i2c_gpio_scl=1 bus=9 2>/dev/null || true
sleep 1
[ -e /dev/i2c-9 ] || { echo "i2c-9 did not appear"; exit 1; }
i2cdetect -y 9 | grep -q "50" || { echo "no EEPROM at 0x50 — check U4"; exit 1; }

python3 - <<'PY'
import subprocess, sys, time
data = open("exopet-hat.eep", "rb").read()
BUS, ADDR, PAGE = "9", "0x50", 32
for off in range(0, len(data), PAGE):
    chunk = data[off:off+PAGE]
    subprocess.run(["i2ctransfer", "-y", BUS, f"w{len(chunk)+2}@{ADDR}",
                    str(off >> 8), str(off & 0xFF)]
                   + [str(b) for b in chunk], check=True)
    time.sleep(0.02)
bad = 0
for off in range(0, len(data), PAGE):
    chunk = data[off:off+PAGE]
    r = subprocess.run(["i2ctransfer", "-y", BUS, f"w2@{ADDR}",
                        str(off >> 8), str(off & 0xFF),
                        f"r{len(chunk)}@{ADDR}"],
                       capture_output=True, text=True, check=True)
    if bytes(int(x, 16) for x in r.stdout.split()) != chunk:
        print("MISMATCH at", off); bad += 1
print("VERIFY", "FAILED (check JP2 open)" if bad else
      "OK — HAT EEPROM provisioned. Reboot to load /proc/device-tree/hat.")
sys.exit(1 if bad else 0)
PY
dtoverlay -r i2c-gpio 2>/dev/null || true
