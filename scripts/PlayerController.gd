extends CharacterBody3D

class_name PlayerController

@export var speed: float = 4.5
@export var mouse_sensitivity: float = 0.0025
@export var gravity: float = 9.8

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D
@onready var laser_ray: RayCast3D = $Head/LaserRay
@onready var zebra_tc5x: Node3D = $Head/ZebraHand3D

var is_inspecting_drawer: bool = false
var is_aiming_zebra: bool = false

# Positionnement ergonomique naturel du Zebra TC5x dans la main droite
var zebra_idle_pos := Vector3(0.22, -0.18, -0.38)
var zebra_idle_rot := Vector3(deg_to_rad(-12), deg_to_rad(-15), deg_to_rad(6))

# Position de visée / inspection en plein centre de l'écran (Clic Droit)
var zebra_aim_pos := Vector3(0.0, -0.06, -0.28)
var zebra_aim_rot := Vector3(deg_to_rad(-5), 0, 0)

var original_camera_transform: Transform3D

func _ready() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	if zebra_tc5x:
		zebra_tc5x.position = zebra_idle_pos
		zebra_tc5x.rotation = zebra_idle_rot

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

	# Viser / inspecter l'écran du Zebra (Clic Droit maintenu ou touche Z)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT and not is_inspecting_drawer:
		set_aiming_zebra(event.pressed)

	# Déclencher le tir laser du lecteur code-barres (Espace ou Clic Gauche)
	if event.is_action_pressed("laser_scan") and not is_inspecting_drawer:
		trigger_laser_scan()

func set_aiming_zebra(aiming: bool) -> void:
	is_aiming_zebra = aiming
	var tween = create_tween().set_parallel(true)
	tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	if aiming:
		tween.tween_property(zebra_tc5x, "position", zebra_aim_pos, 0.16)
		tween.tween_property(zebra_tc5x, "rotation", zebra_aim_rot, 0.16)
	else:
		tween.tween_property(zebra_tc5x, "position", zebra_idle_pos, 0.20)
		tween.tween_property(zebra_tc5x, "rotation", zebra_idle_rot, 0.20)

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
	if zebra_tc5x and zebra_tc5x.has_method("fire_laser"):
		zebra_tc5x.fire_laser(0.25)

	if laser_ray.is_colliding():
		var target = laser_ray.get_collider()
		if target and target.has_method("on_scanned_by_zebra"):
			target.on_scanned_by_zebra(self)
		elif target and target.get_parent() and target.get_parent().has_method("on_scanned_by_zebra"):
			target.get_parent().on_scanned_by_zebra(self)

func enter_drawer_inspection(drawer_camera_marker: Marker3D) -> void:
	is_inspecting_drawer = true
	if zebra_tc5x:
		zebra_tc5x.visible = false
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	original_camera_transform = camera.global_transform
	
	var tween = create_tween()
	tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(camera, "global_transform", drawer_camera_marker.global_transform, 0.5)

func exit_drawer_inspection() -> void:
	var tween = create_tween()
	tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(camera, "global_transform", original_camera_transform, 0.5)
	await tween.finished
	is_inspecting_drawer = false
	if zebra_tc5x:
		zebra_tc5x.visible = true
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
