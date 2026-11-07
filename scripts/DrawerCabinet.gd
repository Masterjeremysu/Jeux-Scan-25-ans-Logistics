extends StaticBody3D

class_name DrawerCabinet

@export var location_code: String = "LOC-B01-T03"
@export var designation: String = "BRIDES & RACCORDS KF40 INOX"

@onready var sliding_drawer: Node3D = $SlidingDrawer
@onready var inspection_camera_marker: Marker3D = $SlidingDrawer/CameraMarker
@onready var kf40_pieces: Node3D = $SlidingDrawer/PiecesKF40
@onready var prompt_label = get_node_or_null("PromptLabel3D")

var is_open: bool = false
var pieces_picked: int = 0
var required_pieces: int = 2
var player_ref: Node = null

func _ready() -> void:
	add_to_group("scannable")
	if prompt_label:
		prompt_label.text = "[E] OUVRIR LE TIROIR\nLOC-B01-T03 (Brides KF40 Inox)"

func on_scanned_by_zebra(player: Node) -> void:
	player_ref = player
	toggle_drawer()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("interact"):
		var player = get_tree().get_first_node_in_group("player")
		if player and global_position.distance_to(player.global_position) < 4.0:
			player_ref = player
			if is_open and kf40_pieces and kf40_pieces.get_child_count() > 0:
				var piece = kf40_pieces.get_child(0)
				pick_piece(piece)
			else:
				toggle_drawer()

func toggle_drawer() -> void:
	if is_open:
		close_drawer()
	else:
		open_drawer()

func open_drawer() -> void:
	if is_open:
		return
	is_open = true
	if prompt_label:
		prompt_label.text = "[CLIC] PRÉLEVER LES PIÈCES"
	
	var tween = create_tween()
	tween.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(sliding_drawer, "position:z", 0.85, 0.5)
	
	# Bip de confirmation sur le Zebra
	var mgr = get_tree().get_first_node_in_group("warehouse_manager")
	if mgr:
		var ui = mgr.get_zebra_screen()
		if ui and ui.has_method("set_status"):
			ui.set_status("Tiroir ouvert ! Cliquez sur les brides KF40 (0/2)", Color(0.96, 0.65, 0.08))

	if player_ref and player_ref.has_method("enter_drawer_inspection"):
		player_ref.enter_drawer_inspection(inspection_camera_marker)

func close_drawer() -> void:
	if not is_open:
		return
	is_open = false
	if prompt_label:
		prompt_label.text = "[E] OUVRIR LE TIROIR\nLOC-B01-T03"
		
	var tween = create_tween()
	tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tween.tween_property(sliding_drawer, "position:z", 0.0, 0.4)
	
	if player_ref and player_ref.has_method("exit_drawer_inspection"):
		player_ref.exit_drawer_inspection()

func pick_piece(piece_node: Node) -> void:
	if not is_open:
		return
	
	pieces_picked += 1
	var tween = create_tween()
	tween.tween_property(piece_node, "position:y", piece_node.position.y + 0.25, 0.15)
	tween.tween_property(piece_node, "scale", Vector3.ZERO, 0.10)
	tween.tween_callback(func(): piece_node.queue_free())
	
	var warehouse = get_tree().get_first_node_in_group("warehouse_manager")
	if warehouse and warehouse.has_method("on_piece_picked"):
		warehouse.on_piece_picked(pieces_picked, required_pieces)

	if pieces_picked >= required_pieces:
		get_tree().create_timer(0.6).timeout.connect(close_drawer)
