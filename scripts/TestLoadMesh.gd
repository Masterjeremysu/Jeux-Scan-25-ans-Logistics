@tool
extends SceneTree

func _init() -> void:
	var models = ["pallet_euro.obj", "bott_cabinet.obj", "kf40_flange.obj", "cardboard_carton.obj", "logistics_operator.obj"]
	for m in models:
		var mesh: ArrayMesh = load("res://models/" + m)
		if mesh:
			print(m, " -> surfaces: ", mesh.get_surface_count())
			for i in range(mesh.get_surface_count()):
				print("   surface ", i, ": name=", mesh.surface_get_name(i))
	quit()
