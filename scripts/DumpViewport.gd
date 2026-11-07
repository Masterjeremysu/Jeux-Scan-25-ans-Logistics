extends Node

func _ready() -> void:
	await get_tree().create_timer(0.5).timeout
	var vp = get_node_or_null("/root/MainWarehouse/Player/Head/ZebraHand3D/SubViewport")
	if vp:
		var tex = vp.get_texture()
		if tex:
			var img = tex.get_image()
			if img:
				img.save_png("res://subviewport_dump.png")
				print("✓ SubViewport dumped: size=", img.get_size())
