extends CharacterBody3D

class_name PlayerController

@export var speed: float = 4.5
@export var mouse_sensitivity: float = 0.0022
@export var gravity: float = 9.8

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D
@onready var laser_ray: RayCast3D = $Head/LaserRay
@onready var zebra_tc5x: Node3D = $Head/ZebraHand3D

var is_inspecting_drawer: bool = false
var is_aiming_zebra: bool = false

# Positions et rotations ergonomiques naturelles du Zebra
var zebra_idle_pos := Vector3(0.22, -0.18, -0.38)
var zebra_idle_rot := Vector3(deg_to_rad(-10), deg_to_rad(-14), deg_to_rad(5))

var zebra_aim_base_pos := Vector3(0.0, -0.06, -0.28)
var zebra_aim_base_rot := Vector3(deg_to_rad(-4), 0, 0)

# Inertie procédurale (Item Sway) et balancement au pas (Bobbing)
var sway_offset := Vector3.ZERO
var sway_rot_offset := Vector3.ZERO
var bobbing_time := 0.0

# Contrôle "Axe Humain Libre" du poignet lors de l'inspection (Clic Droit)
var wrist_pitch := 0.0
var wrist_yaw := 0.0
var wrist_roll := 0.0

var original_camera_transform: Transform3D

func _ready() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	if zebra_tc5x:
		zebra_tc5x.position = zebra_idle_pos
		zebra_tc5x.rotation = zebra_idle_rot

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED and not is_inspecting_drawer:
		if is_aiming_zebra:
			# Mode Axe Humain Libre : Le poignet incline librement le Zebra dans la main !
			wrist_yaw -= event.relative.x * 0.003
			wrist_pitch -= event.relative.y * 0.003
			wrist_yaw = clamp(wrist_yaw, deg_to_rad(-45), deg_to_rad(45))
			wrist_pitch = clamp(wrist_pitch, deg_to_rad(-40), deg_to_rad(40))
			wrist_roll = -wrist_yaw * 0.35
		else:
			# Rotation normale de la caméra
			rotate_y(-event.relative.x * mouse_sensitivity)
			head.rotate_x(-event.relative.y * mouse_sensitivity)
			head.rotation.x = clamp(head.rotation.x, deg_to_rad(-70), deg_to_rad(70))
			
			# Sway naturel d'inertie de la main
			sway_offset.x = clamp(-event.relative.x * 0.0008, -0.04, 0.04)
			sway_offset.y = clamp(event.relative.y * 0.0008, -0.03, 0.03)
			sway_rot_offset.y = clamp(-event.relative.x * 0.0015, -0.15, 0.15)
			sway_rot_offset.x = clamp(-event.relative.y * 0.0015, -0.12, 0.12)

	if event.is_action_pressed("ui_cancel"):
		if is_inspecting_drawer:
			exit_drawer_inspection()
		else:
			if Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
				Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
			else:
				Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

	# Mode Visée / Inspection libre au poignet (Clic Droit)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT and not is_inspecting_drawer:
		set_aiming_zebra(event.pressed)

	# Déclencher le tir laser du lecteur code-barres (Espace ou Clic Gauche)
	if event.is_action_pressed("laser_scan") and not is_inspecting_drawer:
		trigger_laser_scan()

func set_aiming_zebra(aiming: bool) -> void:
	is_aiming_zebra = aiming
	if not aiming:
		# Réinitialiser doucement la rotation libre du poignet
		var tween = create_tween().set_parallel(true)
		tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tween.tween_property(self, "wrist_pitch", 0.0, 0.2)
		tween.tween_property(self, "wrist_yaw", 0.0, 0.2)
		tween.tween_property(self, "wrist_roll", 0.0, 0.2)

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
		bobbing_time += delta * 9.0
	else:
		velocity.x = move_toward(velocity.x, 0, speed)
		velocity.z = move_toward(velocity.z, 0, speed)
		bobbing_time += delta * 2.0

	move_and_slide()
	update_zebra_transform(delta)

func update_zebra_transform(delta: float) -> void:
	if not zebra_tc5x or is_inspecting_drawer:
		return

	# Amortissement du sway d'inertie vers zéro
	sway_offset = sway_offset.lerp(Vector3.ZERO, delta * 8.0)
	sway_rot_offset = sway_rot_offset.lerp(Vector3.ZERO, delta * 8.0)

	# Balancement de marche / respiration humaine (Bobbing)
	var is_moving = velocity.length() > 0.2
	var bob_x = cos(bobbing_time * 0.5) * (0.012 if is_moving else 0.002)
	var bob_y = sin(bobbing_time) * (0.016 if is_moving else 0.003)

	var target_pos: Vector3
	var target_rot: Vector3

	if is_aiming_zebra:
		# Position centrale avec liberté totale de rotation au poignet par la souris
		target_pos = zebra_aim_base_pos + Vector3(bob_x * 0.2, bob_y * 0.2, 0)
		target_rot = zebra_aim_base_rot + Vector3(wrist_pitch, wrist_yaw, wrist_roll)
	else:
		# Position naturelle en main droite avec sway et bobbing
		target_pos = zebra_idle_pos + sway_offset + Vector3(bob_x, bob_y, 0)
		target_rot = zebra_idle_rot + sway_rot_offset

	zebra_tc5x.position = zebra_tc5x.position.lerp(target_pos, delta * 14.0)
	zebra_tc5x.rotation = zebra_tc5x.rotation.lerp(target_rot, delta * 14.0)

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
