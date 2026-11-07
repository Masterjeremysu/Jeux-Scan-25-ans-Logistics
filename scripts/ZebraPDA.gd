extends Control

class_name ZebraPDA

func update_mission(cmd_id: String, dest: String, loc: String, ref_name: String, qte_req: int) -> void:
	if not is_inside_tree() or not is_node_ready():
		await ready

	var lbl_cmd = get_node_or_null("VBox/Header/CmdLabel") as Label
	var lbl_dest = get_node_or_null("VBox/DestLabel") as Label
	var lbl_loc = get_node_or_null("VBox/LocLabel") as Label
	var lbl_qte = get_node_or_null("VBox/QteLabel") as Label

	if lbl_cmd: lbl_cmd.text = cmd_id
	if lbl_dest: lbl_dest.text = "DESTINATAIRE : " + dest
	if lbl_loc: lbl_loc.text = "📍 " + loc
	if lbl_qte: lbl_qte.text = ref_name + " [x" + str(qte_req) + "]"
	set_step_status("1/4 - Scannez l'étiquette EAN-128 du tiroir", Color.SKY_BLUE)

func set_step_status(text: String, col: Color) -> void:
	if not is_inside_tree() or not is_node_ready():
		await ready
	var lbl_status = get_node_or_null("VBox/StatusLabel") as Label
	if lbl_status:
		lbl_status.text = text
		lbl_status.modulate = col
