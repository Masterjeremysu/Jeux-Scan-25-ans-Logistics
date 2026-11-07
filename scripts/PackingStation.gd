extends StaticBody3D

class_name PackingStation

@onready var shipping_box: MeshInstance3D = $CardboardShippingBox
@onready var printer_led: MeshInstance3D = $ZebraZT411Printer/PrinterLED

var is_packed: bool = false

func _ready() -> void:
	add_to_group("scannable")

func on_scanned_by_zebra(_player: Node) -> void:
	pack_order()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("interact"):
		var player = get_tree().get_first_node_in_group("player")
		if player and global_position.distance_to(player.global_position) < 3.5:
			pack_order()

func pack_order() -> void:
	var mgr = get_tree().get_first_node_in_group("warehouse_manager")
	if not mgr or mgr.step < 3:
		return
	
	if is_packed:
		return
		
	is_packed = true
	# Animation du ruban adhésif et clignotement de l'imprimante thermique ZT411
	var tween = create_tween().set_parallel(true)
	tween.tween_property(shipping_box, "scale", Vector3(1.05, 1.05, 1.05), 0.15)
	tween.chain().tween_property(shipping_box, "scale", Vector3.ONE, 0.15)
	
	# Son et notification gestionnaire
	mgr.on_box_packed()
