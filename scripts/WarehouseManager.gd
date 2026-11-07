extends Node

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
var screen_ui: Node = null

func _ready() -> void:
	add_to_group("warehouse_manager")
	await get_tree().process_frame
	start_mission(0)

func get_zebra_screen() -> Node:
	if not screen_ui or not is_instance_valid(screen_ui):
		screen_ui = get_tree().get_first_node_in_group("zebra_screen_ui")
	return screen_ui

func start_mission(idx: int) -> void:
	current_mission_index = idx
	step = 1
	var m = missions[idx]
	var ui = get_zebra_screen()
	if ui and ui.has_method("update_mission_data"):
		ui.update_mission_data(m["cmd"], m["dest"], m["loc"], m["ref"], m["qte"])

func on_piece_picked(current: int, total: int) -> void:
	var ui = get_zebra_screen()
	if ui and ui.has_method("set_status"):
		if current < total:
			ui.set_status("Prélevé %d/%d. Prenez la 2ème pièce !" % [current, total], Color(0.96, 0.65, 0.08))
		else:
			step = 3
			ui.set_status("Prélèvement terminé (2/2) ! Allez à la table d'emballage.", Color(0.2, 0.9, 0.3))

func on_box_packed() -> void:
	step = 4
	var ui = get_zebra_screen()
	if ui and ui.has_method("set_status"):
		var m = missions[current_mission_index]
		ui.set_status("Carton scellé ! Déposez sur étagère %s" % m["delivery_shelf"], Color(0.96, 0.85, 0.1))

func on_delivered() -> void:
	var ui = get_zebra_screen()
	if ui and ui.has_method("set_status"):
		ui.set_status("COMMANDE VALIDÉE ! +500 PTS LOGISTIQUE", Color(0.1, 1.0, 0.3))
	emit_signal("mission_completed")
