extends StaticBody3D

class_name DrawerCabinet

@export var location_code: String = "LOC-B01-T03"
@export var designation: String = "BRIDES & RACCORDS KF40"

@onready var sliding_drawer: Node3D = $SlidingDrawer
@onready var inspection_camera_marker: Marker3D = $SlidingDrawer/CameraMarker
@onready var kf40_pieces: Node3D = $SlidingDrawer/PiecesKF40

var is_open: bool = false
var pieces_picked: int = 0
var required_pieces: int = 2
var player_ref: Node = null

func _ready() -> void:
	add_to_group("scannable")
	# Connecter les clics sur les pièces KF40
	for piece in kf40_pieces.get_children():
		if piece is Area3D:
			piece.input_event.connect(_on_piece_input_event.bind(piece))

func on_scanned_by_zebra(player: Node) -> void:
	player_ref = player
	if not is_open:
		open_drawer()

func open_drawer() -> void:
	is_open = true
	var tween = create_tween()
	tween.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(sliding_drawer, "position:z", 0.85, 0.6)
	
	if player_ref and player_ref.has_method("enter_drawer_inspection"):
		player_ref.enter_drawer_inspection(inspection_camera_marker)

func close_drawer() -> void:
	is_open = false
	var tween = create_tween()
	tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tween.tween_property(sliding_drawer, "position:z", 0.0, 0.4)
	
	if player_ref and player_ref.has_method("exit_drawer_inspection"):
		player_ref.exit_drawer_inspection()

func _on_piece_input_event(_camera: Node, event: InputEvent, _pos: Vector3, _normal: Vector3, _shape_idx: int, piece: Area3D) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		pick_piece(piece)

func pick_piece(piece_node: Node) -> void:
	if not is_open:
		return
	
	pieces_picked += 1
	var tween = create_tween()
	tween.tween_property(piece_node, "position:y", piece_node.position.y + 0.2, 0.18)
	tween.tween_property(piece_node, "scale", Vector3.ZERO, 0.12)
	tween.tween_callback(func(): piece_node.queue_free())
	
	# Notifier le gestionnaire d'entrepôt
	var warehouse = get_tree().get_first_node_in_group("warehouse_manager")
	if warehouse and warehouse.has_method("on_piece_picked"):
		warehouse.on_piece_picked(pieces_picked, required_pieces)

	if pieces_picked >= required_pieces:
		get_tree().create_timer(0.6).timeout.connect(close_drawer)
