extends Area3D

@export var item_name: String = "Bride KF40 Inox"

func _ready() -> void:
	input_ray_pickable = true
	input_event.connect(_on_input_event)

func _on_input_event(_camera: Camera3D, event: InputEvent, _position: Vector3, _normal: Vector3, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		pickup()

func pickup() -> void:
	var cabinet = find_cabinet(self)
	if cabinet and cabinet.has_method("pick_piece"):
		cabinet.pick_piece(self)

func find_cabinet(node: Node) -> Node:
	var p = node.get_parent()
	while p:
		if p.has_method("pick_piece"):
			return p
		p = p.get_parent()
	return null
