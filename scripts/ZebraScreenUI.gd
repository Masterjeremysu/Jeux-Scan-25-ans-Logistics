extends Control

signal tab_changed(tab_name: String)
signal action_triggered(action_name: String)

@onready var lbl_cmd: Label = get_node_or_null("Background/Content/Header/CmdLabel")
@onready var lbl_dest: Label = get_node_or_null("Background/Content/TabCollecte/DestBox/VBox/DestLabel")
@onready var lbl_loc: Label = get_node_or_null("Background/Content/TabCollecte/LocBox/VBox/LocLabel")
@onready var lbl_ref: Label = get_node_or_null("Background/Content/TabCollecte/RefBox/VBox/RefLabel")
@onready var lbl_status: Label = get_node_or_null("Background/Content/StatusBox/StatusLabel")
@onready var tab_collecte: Control = get_node_or_null("Background/Content/TabCollecte")
@onready var tab_livraison: Control = get_node_or_null("Background/Content/TabLivraison")
@onready var tab_manutention: Control = get_node_or_null("Background/Content/TabManutention")
@onready var tab_salle_blanche: Control = get_node_or_null("Background/Content/TabSalleBlanche")

var current_tab: String = "collecte"

func _ready() -> void:
	switch_tab("collecte")

func switch_tab(tab_name: String) -> void:
	current_tab = tab_name
	if tab_collecte: tab_collecte.visible = (tab_name == "collecte")
	if tab_livraison: tab_livraison.visible = (tab_name == "livraison")
	if tab_manutention: tab_manutention.visible = (tab_name == "manutention")
	if tab_salle_blanche: tab_salle_blanche.visible = (tab_name == "salle_blanche")
	emit_signal("tab_changed", tab_name)

func _on_btn_collecte_pressed() -> void:
	play_click_feedback()
	switch_tab("collecte")

func _on_btn_livraison_pressed() -> void:
	play_click_feedback()
	switch_tab("livraison")

func _on_btn_manutention_pressed() -> void:
	play_click_feedback()
	switch_tab("manutention")

func _on_btn_salle_blanche_pressed() -> void:
	play_click_feedback()
	switch_tab("salle_blanche")

func _on_btn_scan_laser_pressed() -> void:
	play_click_feedback()
	var player = get_tree().get_first_node_in_group("player")
	if player and player.has_method("trigger_laser_scan"):
		player.trigger_laser_scan()

func _on_btn_open_drawer_pressed() -> void:
	play_click_feedback()
	var cabinet = get_tree().get_first_node_in_group("scannable")
	if cabinet and cabinet.has_method("open_drawer"):
		cabinet.open_drawer()

func play_click_feedback() -> void:
	var pda = get_tree().get_first_node_in_group("zebra_pda")
	if pda and pda.has_method("play_scan_beep"):
		pda.play_scan_beep(true)

func update_mission_data(cmd: String, dest: String, loc: String, ref_name: String, qte: int) -> void:
	if not is_inside_tree() or not is_node_ready():
		await ready

	if lbl_cmd: lbl_cmd.text = cmd
	if lbl_dest: lbl_dest.text = dest
	if lbl_loc: lbl_loc.text = "📍 " + loc
	if lbl_ref: lbl_ref.text = ref_name + " (x" + str(qte) + ")"
	set_status("1/4 - Scannez l'emplacement EAN-128", Color(0.2, 0.7, 1.0))

func set_status(text: String, col: Color) -> void:
	if not is_inside_tree() or not is_node_ready():
		await ready
	if lbl_status:
		lbl_status.text = text
		lbl_status.modulate = col
