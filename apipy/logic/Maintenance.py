from data.common import db_connection, dict_factory
import RPi.GPIO as GPIO
import time

# GPIO pins
RELAY_1 = 26
RELAY_2 = 20
RELAY_3 = 21

def initGpio():
    # Setup GPIO
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(RELAY_1, GPIO.OUT)
    GPIO.setup(RELAY_2, GPIO.OUT)
    GPIO.setup(RELAY_3, GPIO.OUT)
    GPIO.output(RELAY_1, GPIO.HIGH)  
    GPIO.output(RELAY_2, GPIO.HIGH)  
    GPIO.output(RELAY_3, GPIO.HIGH)  

def set_service_status(tank_id, service_status):
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    cursor.execute("UPDATE tanks SET service_status = ? WHERE id = ?", (service_status, tank_id))
    conn.commit()
    conn.close()
    

# Function to control pins
def water_change(drain_time=0, fill_time=0, res_fill_time=0):
    drain(drain_time, True)
    fill(fill_time)
    if res_fill_time & res_fill_time > 0:
        res_fill(res_fill_time)

def stop():
    GPIO.output(RELAY_1, GPIO.HIGH)
    GPIO.output(RELAY_2, GPIO.HIGH)
    GPIO.output(RELAY_3, GPIO.HIGH)
    set_service_status(1, 0)
    
def drain(drain_time, changing = False):
    GPIO.output(RELAY_1, GPIO.LOW)
    if not changing:
        set_service_status(1,1)
    else:
        set_service_status(1, 5)
    time.sleep(drain_time)
    GPIO.output(RELAY_1, GPIO.HIGH)  

def fill(fill_time, changing = False):
    GPIO.output(RELAY_2, GPIO.LOW)
    if not changing:
        set_service_status(1,2)
    else:
        set_service_status(1, 6)
    time.sleep(fill_time)
    GPIO.output(RELAY_2, GPIO.HIGH)

def res_fill(res_fill_time, changing):
    GPIO.output(RELAY_3, GPIO.LOW)
    if not changing:
        set_service_status(1,3)
    else:
        set_service_status(1, 7)
    time.sleep(res_fill_time)
    GPIO.output(RELAY_3, GPIO.HIGH)