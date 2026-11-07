extends StaticBody3D

class_name DeliveryShelf

@export var shelf_id: String = "LIV-LETI17"
@export var destination_name: String = "Bâtiment 17 - LETI"

var is_delivered: bool = false

func _ready() -> void:
	add_to_group("scannable")

func on_scanned_by_zebra(_player: Node) -> void:
	deliver_order()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("interact"):
		var player = get_tree().get_first_node_in_group("player")
		if player and global_position.distance_to(player.global_position) < 3.5:
			deliver_order()

func deliver_order() -> void:
	var mgr = get_tree().get_first_node_in_group("warehouse_manager")
	if not mgr or mgr.step < 4:
		return
		
	if is_delivered:
		return
		
	is_delivered = true
	mgr.on_delivered()
