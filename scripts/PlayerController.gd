extends CharacterBody3D

class_name PlayerController

@export var speed: float = 4.5
@export var mouse_sensitivity: float = 0.0025
@export var gravity: float = 9.8

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D
@onready var laser_ray: RayCast3D = $Head/LaserRay
@onready var laser_beam: MeshInstance3D = $Head/LaserBeam
@onready var zebra_display: Node = $CanvasLayer/ZebraPDA

var is_inspecting_drawer: bool = false
var original_camera_transform: Transform3D

func _ready() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	laser_beam.visible = false

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED and not is_inspecting_drawer:
		rotate_y(-event.relative.x * mouse_sensitivity)
		head.rotate_x(-event.relative.y * mouse_sensitivity)
		head.rotation.x = clamp(head.rotation.x, deg_to_rad(-70), deg_to_rad(70))

	if event.is_action_pressed("ui_cancel"):
		if is_inspecting_drawer:
			exit_drawer_inspection()
		else:
			if Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
				Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
			else:
				Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

	if event.is_action_pressed("laser_scan") and not is_inspecting_drawer:
		trigger_laser_scan()

func _physics_process(delta: float) -> void:
	if is_inspecting_drawer:
		return

	if not is_on_floor():
		velocity.y -= gravity * delta

	var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
	var direction := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()

	if direction:
		velocity.x = direction.x * speed
		velocity.z = direction.z * speed
	else:
		velocity.x = move_toward(velocity.x, 0, speed)
		velocity.z = move_toward(velocity.z, 0, speed)

	move_and_slide()

func trigger_laser_scan() -> void:
	laser_beam.visible = true
	get_tree().create_timer(0.2).timeout.connect(func(): laser_beam.visible = false)

	if laser_ray.is_colliding():
		var target = laser_ray.get_collider()
		if target.has_method("on_scanned_by_zebra"):
			target.on_scanned_by_zebra(self)

func enter_drawer_inspection(drawer_camera_marker: Marker3D) -> void:
	is_inspecting_drawer = true
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	original_camera_transform = camera.global_transform
	
	var tween = create_tween()
	tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(camera, "global_transform", drawer_camera_marker.global_transform, 0.6)

func exit_drawer_inspection() -> void:
	if not is_inspecting_drawer:
		return
	is_inspecting_drawer = false
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	
	var tween = create_tween()
	tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(camera, "transform", Transform3D.IDENTITY, 0.5)
