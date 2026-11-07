extends Node

class_name WarehouseManager

signal mission_completed

var current_mission_index: int = 0
var missions = [
	{
		"cmd": "CMD-CEA-2026-601",
		"dest": "Bâtiment 17 - LETI (Nano-Caractérisation)",
		"loc": "LOC-B01-T03",
		"ref": "Brides KF40 Inox",
		"qte": 2,
		"delivery_shelf": "LIV-LETI17"
	},
	{
		"cmd": "CMD-CEA-2026-602",
		"dest": "Bâtiment 22 - Minatec Salle Blanche",
		"loc": "LOC-C01-F01",
		"ref": "FOSB Vert 300mm",
		"qte": 1,
		"delivery_shelf": "LIV-MIN22"
	}
]

var step: int = 1
var zebra_ref: ZebraPDA = null

func _ready() -> void:
	add_to_group("warehouse_manager")
	await get_tree().process_frame
	start_mission(0)

func start_mission(idx: int) -> void:
	current_mission_index = idx
	step = 1
	var m = missions[idx]
	zebra_ref = get_tree().get_first_node_in_group("zebra_pda") as ZebraPDA
	if zebra_ref:
		zebra_ref.update_mission(m["cmd"], m["dest"], m["loc"], m["ref"], m["qte"])

func on_piece_picked(current: int, total: int) -> void:
	if zebra_ref:
		if current >= total:
			step = 3
			zebra_ref.set_step_status("3/4 - Pièces prélevées ! Préparez le carton à l'établi central", Color.GOLD)
		else:
			zebra_ref.set_step_status("2/4 - Prélevé " + str(current) + " / " + str(total), Color.ORANGE)

func on_box_packed() -> void:
	step = 4
	var m = missions[current_mission_index]
	if zebra_ref:
		zebra_ref.set_step_status("4/4 - Livrez sur l'étagère dédiée [" + m["delivery_shelf"] + "]", Color.GREEN)

func on_shelf_delivered(shelf_id: String) -> void:
	var m = missions[current_mission_index]
	if shelf_id == m["delivery_shelf"] and step == 4:
		if zebra_ref:
			zebra_ref.set_step_status("✅ COMMANDE EXPÉDIÉE AVEC SUCCÈS !", Color.GREEN)
		get_tree().create_timer(3.0).timeout.connect(func():
			start_mission((current_mission_index + 1) % missions.size())
		)
