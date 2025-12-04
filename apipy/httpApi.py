import json
from flask import Blueprint, request, jsonify
from data.common import db_connection, dict_factory
from logic.Climate import read_temp
from logic.Maintenance import drain, fill, set_service_status, stop, water_change

api_blueprint = Blueprint('api_blueprint', __name__)

# API endpoint
@api_blueprint.route('/maintenance/change/<int:tank_id>', methods=['GET'])
def water_change_endpoint(tank_id):
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tanks WHERE id = ?", (tank_id,))
    tanks_data = cursor.fetchone()
    
    if not tanks_data:
        return jsonify({'error': 'Tank not found'}), 404

    properties_string = tanks_data['properties']
    # Deserialize the JSON string back into a Python dictionary
    properties = json.loads(properties_string)

    drain_time = properties['drain_time']
    fill_time = properties['fill_time']
    has_reservoir = properties['has_reservoir']
    res_fill_time = properties.get('res_fill_time')  # Using .get() is safer for optional properties

    if has_reservoir:
        water_change(drain_time,fill_time,res_fill_time)
    else:
        water_change(drain_time,fill_time)

    set_service_status(1,0)
    add_log(None,tank_id,"Performed Water Change", {})

    return jsonify({'message': 'Water change complete.'})

@api_blueprint.route('/maintenance/fill/<int:tank_id>', methods=['GET'])
def fill_tank_endpoint(tank_id):
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tanks WHERE id = ?", (tank_id,))
    tanks_data = cursor.fetchone()
    conn.commit()
    conn.close()
    if not tanks_data:
        return jsonify({'error': 'Tank not found'}), 404

    properties_string = tanks_data['properties']
    # Deserialize the JSON string back into a Python dictionary
    properties = json.loads(properties_string)

    fill_time = properties['fill_time']

    fill(fill_time)   
    set_service_status(1,0)    
        
    print(f"{tanks_data}")
    return jsonify({'message': f'Tank was filled for {fill_time} seconds.'})

@api_blueprint.route('/maintenance/drain/<int:tank_id>', methods=['GET'])
def drain_tank_endpoint(tank_id):
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tanks WHERE id = ?", (tank_id,))
    tanks_data = cursor.fetchone()
    conn.commit()
    conn.close()
    if not tanks_data:
        return jsonify({'error': 'Tank not found'}), 404

    properties_string = tanks_data['properties']
    # Deserialize the JSON string back into a Python dictionary
    properties = json.loads(properties_string)

    drain_time = properties['drain_time']

    drain(drain_time)
    set_service_status(1,0)

    print(f"{tanks_data}")
    return jsonify({'message': f'Tank was drained for {drain_time} seconds.'})

@api_blueprint.route('/maintenance/reset/<int:tank_id>', methods=['GET'])
def reset_tank_endpoint(tank_id):
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tanks WHERE id = ?", (tank_id,))
    tanks_data = cursor.fetchone()
    conn.commit()
    conn.close()
    if not tanks_data:
        return jsonify({'error': 'Tank not found'}), 404

    stop()
    set_service_status(1,0)

    print(f"{tanks_data}")
    return jsonify({'message': f'Service status was reset.'})

@api_blueprint.route('/tanks', methods=['POST'])
def add_aquarium():
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()

    name = request.json['name']
    properties = request.json['properties']
    cursor.execute("INSERT INTO tanks (name, properties) VALUES (?, ?, ?)", (name, properties))
    conn.commit()
    conn.close()
    return jsonify(message="Aquarium added"), 201

@api_blueprint.route('/animals', methods=['POST'])
def add_animal():
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()

    tank_id = request.json['tank_id']
    name = request.json['name']
    species = request.json['species']
    cursor.execute("INSERT INTO animals (tank_id, name, species) VALUES (?, ?, ?)", (tank_id, name, species,))
    conn.commit()
    conn.close()
    return jsonify(message="Animal added"), 201

@api_blueprint.route('/status', methods=['POST'])
def update_state():
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()

    tank_id = request.json['tank_id']
    temperature = request.json['temperature']
    pH_level = request.json['pH_level']
    cursor.execute("INSERT INTO water_status (tank_id, temperature, pH_level) VALUES (?, ?, ?)", (tank_id, temperature, pH_level,))
    conn.commit()
    conn.close()
    return jsonify(message="Aquarium state updated"), 201

@api_blueprint.route('/feed', methods=['POST'])
def add_feeding():
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()

    animal_id = request.json['animal_id']
    action_type = request.json['action_type']
    tank_id = request.json['tank_id']
    log_json = request.json['log_json']
    cursor.execute("INSERT INTO logs (animal_id, tank_id, action_type, log_json) VALUES (?, ?, ?, ?)", (animal_id, tank_id, action_type, log_json))
    conn.commit()
    conn.close()
    return jsonify(message="Feeding recorded"), 201

def add_log(animal_id, tank_id, action_type, log_json):
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    animal_id = request.json['animal_id']
    action_type = request.json['action_type']
    tank_id = request.json['tank_id']
    log_json = request.json['log_json']
    cursor.execute("INSERT INTO logs (animal_id, tank_id, action_type, log_json) VALUES (?, ?, ?, ?)", (animal_id, tank_id, action_type, log_json))
    conn.commit()
    conn.close()

@api_blueprint.route('/tanks', methods=['GET'])
def get_aquariums():
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    cursor.execute("""
        SELECT animals.*, tanks.*
        FROM tanks
        INNER JOIN animals ON tanks.id = animals.tank_id
    """)
    aquariums = cursor.fetchall()
    conn.close()
    return jsonify(aquariums)

@api_blueprint.route('/animals', methods=['GET'])
def get_animals():
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM animals")
    animals = cursor.fetchall()
    conn.close()
    return jsonify(animals)

@api_blueprint.route('/animal/<int:animal_id>', methods=['GET'])
def get_animal_details(animal_id):
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()

    # Fetch tanks data
    cursor.execute("SELECT * FROM animals WHERE id = ?", (animal_id,))
    animal_data = cursor.fetchone()

    # Fetch logs data
    cursor.execute("SELECT * FROM logs WHERE animal_id = ? ORDER BY timestamp DESC", (animal_id,))
    logs_data = cursor.fetchall()

    # Fetch last feeding log for each animal    
    cursor.execute("""
            SELECT * FROM logs 
            WHERE tank_id = ? AND animal_id = ? AND action_type = 'Feeding'
            ORDER BY timestamp DESC 
            LIMIT 1
        """, (animal_id, animal_data['id']))
    feeding_log = cursor.fetchone()
    
    animal_data['last_feeding_log'] = feeding_log

    conn.close()
    # Construct the response object
    response = {
        "animal": animal_data,
        "logs": logs_data
    }
    return jsonify(response)


@api_blueprint.route('/tank/<int:tank_id>', methods=['GET'])
def get_tank_details(tank_id):
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()

    # Fetch tanks data
    cursor.execute("SELECT * FROM tanks WHERE id = ?", (tank_id,))
    tanks_data = cursor.fetchall()

    # Fetch animals data
    cursor.execute("SELECT * FROM animals WHERE tank_id = ?", (tank_id,))
    animals_data = cursor.fetchall()

    # Fetch logs data
    cursor.execute("SELECT * FROM logs WHERE tank_id = ?", (tank_id,))
    logs_data = cursor.fetchall()

    # Fetch last feeding log for each animal    
    for animal in animals_data:
        cursor.execute("""
            SELECT * FROM logs 
            WHERE tank_id = ? AND animal_id = ? AND action_type = 'Feeding'
            ORDER BY timestamp DESC 
            LIMIT 1
        """, (tank_id, animal['id']))
        feeding_log = cursor.fetchone()
        animal['last_feeding_log'] = feeding_log

    conn.close()
    # Construct the response object
    response = {
        "tank": tanks_data[0] if tanks_data else None,
        "animals": animals_data,
        "logs": logs_data
    }
    return jsonify(response)

@api_blueprint.route('/status/<int:tank_id>', methods=['GET'])
def get_states(tank_id):
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM water_status WHERE tank_id = ? ORDER BY timestamp DESC LIMIT 50", (tank_id,))
    states = cursor.fetchall()
    conn.close()
    return jsonify(states)

@api_blueprint.route('/tank/<int:tank_id>/temperature')
def temperature(tank_id=0):
    temp_c = read_temp(tank_id)
    return jsonify({'temperature_celsius': temp_c})

@api_blueprint.route('/feedings/<int:animal_id>', methods=['GET'])
def get_feedings(animal_id):
    conn = db_connection()
    conn.row_factory = dict_factory
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM feeding WHERE animal_id = ? ORDER BY timestamp DESC LIMIT 50", (animal_id,))
    feedings = cursor.fetchall()
    conn.close()
    return jsonify(feedings)
