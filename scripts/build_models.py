import math
import os

os.makedirs("models", exist_ok=True)

class OBJWriter:
    def __init__(self, filename, mtl_filename=None):
        self.filename = filename
        self.f = open(filename, "w", encoding="utf-8")
        self.v_count = 0
        self.vn_count = 0
        self.vt_count = 0
        self.current_mtl = None
        self.f.write(f"# Wavefront OBJ generated for CEA Logistics 3D\n")
        if mtl_filename:
            self.f.write(f"mtllib {mtl_filename}\n")

    def set_material(self, mtl_name):
        if self.current_mtl != mtl_name:
            self.current_mtl = mtl_name
            self.f.write(f"usemtl {mtl_name}\n")

    def add_vertex(self, x, y, z):
        self.f.write(f"v {x:.4f} {y:.4f} {z:.4f}\n")
        self.v_count += 1
        return self.v_count

    def add_normal(self, nx, ny, nz):
        self.f.write(f"vn {nx:.4f} {ny:.4f} {nz:.4f}\n")
        self.vn_count += 1
        return self.vn_count

    def add_uv(self, u, v):
        self.f.write(f"vt {u:.4f} {v:.4f}\n")
        self.vt_count += 1
        return self.vt_count

    def add_box(self, x0, y0, z0, x1, y1, z1, u_scale=1.0, v_scale=1.0):
        # 8 vertices
        v_start = self.v_count
        verts = [
            (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), # Back (0..3)
            (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)  # Front (4..7)
        ]
        for v in verts:
            self.add_vertex(v[0], v[1], v[2])

        # 6 normals
        n_start = self.vn_count
        self.add_normal(0, 0, -1) # 1: Back
        self.add_normal(0, 0, 1)  # 2: Front
        self.add_normal(0, -1, 0) # 3: Bottom
        self.add_normal(0, 1, 0)  # 4: Top
        self.add_normal(-1, 0, 0) # 5: Left
        self.add_normal(1, 0, 0)  # 6: Right

        # 4 UVs
        t_start = self.vt_count
        self.add_uv(0, 0)
        self.add_uv(u_scale, 0)
        self.add_uv(u_scale, v_scale)
        self.add_uv(0, v_scale)

        def write_quad(v1, v2, v3, v4, n_idx):
            self.f.write(f"f {v_start+v1}/{t_start+1}/{n_start+n_idx} {v_start+v2}/{t_start+2}/{n_start+n_idx} {v_start+v3}/{t_start+3}/{n_start+n_idx} {v_start+v4}/{t_start+4}/{n_start+n_idx}\n")

        write_quad(1, 4, 3, 2, 1) # Back
        write_quad(5, 6, 7, 8, 2) # Front
        write_quad(1, 2, 6, 5, 3) # Bottom
        write_quad(4, 8, 7, 3, 4) # Top
        write_quad(1, 5, 8, 4, 5) # Left
        write_quad(2, 3, 7, 6, 6) # Right

    def add_cylinder(self, cx, cy, cz, radius, height, segments=24, axis='y'):
        v_start = self.v_count
        t_start = self.vt_count
        n_start = self.vn_count

        self.add_uv(0, 0)
        self.add_uv(1, 0)
        self.add_uv(1, 1)
        self.add_uv(0, 1)

        half_h = height * 0.5
        # Bottom and top rings
        for i in range(segments):
            angle = i * (2.0 * math.pi / segments)
            ca = math.cos(angle)
            sa = math.sin(angle)
            if axis == 'y':
                self.add_vertex(cx + ca * radius, cy - half_h, cz + sa * radius)
                self.add_vertex(cx + ca * radius, cy + half_h, cz + sa * radius)
                self.add_normal(ca, 0, sa)
            elif axis == 'z':
                self.add_vertex(cx + ca * radius, cy + sa * radius, cz - half_h)
                self.add_vertex(cx + ca * radius, cy + sa * radius, cz + half_h)
                self.add_normal(ca, sa, 0)

        # Quads around cylinder
        for i in range(segments):
            i_next = (i + 1) % segments
            v1 = v_start + (i * 2) + 1
            v2 = v_start + (i * 2) + 2
            v3 = v_start + (i_next * 2) + 2
            v4 = v_start + (i_next * 2) + 1
            n_idx = n_start + i + 1
            self.f.write(f"f {v1}/{t_start+1}/{n_idx} {v4}/{t_start+2}/{n_idx} {v3}/{t_start+3}/{n_idx} {v2}/{t_start+4}/{n_idx}\n")

    def close(self):
        self.f.close()

# 1. Modèle 3D Palette Euro (Bois détaillée avec 5 planches, 3 traverses, 9 dés et 3 semelles)
def generate_euro_pallet():
    with open("models/pallet_euro.mtl", "w", encoding="utf-8") as mtl:
        mtl.write("newmtl mat_wood\nKd 0.76 0.62 0.44\nKs 0.1 0.1 0.1\nNs 10\n")
    
    obj = OBJWriter("models/pallet_euro.obj", "pallet_euro.mtl")
    obj.set_material("mat_wood")
    # 5 top planks
    plank_w = 0.14
    plank_h = 0.022
    plank_l = 1.20
    spacing = 0.075
    for i, z in enumerate([-0.35, -0.175, 0.0, 0.175, 0.35]):
        obj.add_box(-0.60, 0.12, z - plank_w*0.5, 0.60, 0.12 + plank_h, z + plank_w*0.5, 2.0, 0.5)

    # 3 stringer cross boards
    for x in [-0.52, 0.0, 0.52]:
        obj.add_box(x - 0.07, 0.098, -0.40, x + 0.07, 0.12, 0.40, 0.5, 1.5)

    # 9 spacer blocks (dés)
    for x in [-0.52, 0.0, 0.52]:
        for z in [-0.34, 0.0, 0.34]:
            obj.add_box(x - 0.07, 0.022, z - 0.07, x + 0.07, 0.098, z + 0.07, 0.5, 0.5)

    # 3 bottom deckboards (semelles)
    for z in [-0.34, 0.0, 0.34]:
        obj.add_box(-0.60, 0.0, z - plank_w*0.5, 0.60, 0.022, z + plank_w*0.5, 2.0, 0.5)

    obj.close()
    print("[OK] models/pallet_euro.obj genere")

# 2. Modèle 3D Armoire d'Outillage Industrielle (Bott / Lista)
def generate_bott_cabinet():
    with open("models/bott_cabinet.mtl", "w", encoding="utf-8") as mtl:
        mtl.write("newmtl mat_cabinet_blue\nKd 0.12 0.28 0.52\nKs 0.6 0.6 0.6\nNs 70\n")
        mtl.write("newmtl mat_plinth_black\nKd 0.08 0.08 0.08\nKs 0.2 0.2 0.2\nNs 20\n")
        mtl.write("newmtl mat_drawer_grey\nKd 0.78 0.82 0.86\nKs 0.5 0.5 0.5\nNs 50\n")
        mtl.write("newmtl mat_handle_alu\nKd 0.92 0.94 0.96\nKs 0.9 0.9 0.9\nNs 120\n")

    obj = OBJWriter("models/bott_cabinet.obj", "bott_cabinet.mtl")
    # Carcasse principale
    obj.set_material("mat_cabinet_blue")
    obj.add_box(-0.70, 0.0, -0.45, 0.70, 1.60, 0.45, 1.5, 1.5)
    
    # Socle noir renforcé
    obj.set_material("mat_plinth_black")
    obj.add_box(-0.72, 0.0, -0.47, 0.72, 0.10, 0.47, 1.0, 0.2)
    
    # Façades de tiroirs avec fentes de poignées
    drawer_y = [0.15, 0.42, 0.70, 0.98, 1.26]
    for y in drawer_y:
        obj.set_material("mat_drawer_grey")
        obj.add_box(-0.66, y, 0.44, 0.66, y + 0.24, 0.47, 1.5, 0.5)
        # Poignée aluminium encastrée
        obj.set_material("mat_handle_alu")
        obj.add_box(-0.58, y + 0.18, 0.46, 0.58, y + 0.22, 0.49, 1.0, 0.1)
    obj.close()
    print("[OK] models/bott_cabinet.obj genere")

# 3. Modèle 3D Bride à Vide KF40 Inox (DN40-KF)
def generate_kf40_flange():
    with open("models/kf40_flange.mtl", "w", encoding="utf-8") as mtl:
        mtl.write("newmtl mat_inox\nKd 0.92 0.94 0.98\nKs 0.98 0.98 0.98\nNs 150\n")

    obj = OBJWriter("models/kf40_flange.obj", "kf40_flange.mtl")
    obj.set_material("mat_inox")
    # Anneau central
    obj.add_cylinder(0, 0, 0, 0.055, 0.020, segments=32, axis='y')
    # Collerette conique
    obj.add_cylinder(0, 0.010, 0, 0.048, 0.015, segments=32, axis='y')
    # Tube raccord soudé
    obj.add_cylinder(0, 0.035, 0, 0.038, 0.040, segments=32, axis='y')
    obj.close()
    print("[OK] models/kf40_flange.obj genere")

# 4. Modèle 3D Carton d'Expédition avec plis et ruban
def generate_cardboard_carton():
    with open("models/cardboard_carton.mtl", "w", encoding="utf-8") as mtl:
        mtl.write("newmtl mat_cardboard\nKd 0.74 0.56 0.38\nKs 0.1 0.1 0.1\nNs 10\n")
        mtl.write("newmtl mat_tape\nKd 0.88 0.78 0.50\nKs 0.3 0.3 0.3\nNs 40\n")

    obj = OBJWriter("models/cardboard_carton.obj", "cardboard_carton.mtl")
    # Corps du carton
    obj.set_material("mat_cardboard")
    obj.add_box(-0.30, 0.0, -0.22, 0.30, 0.40, 0.22, 1.0, 1.0)
    # Rebords de rabats supérieurs
    obj.add_box(-0.302, 0.38, -0.222, 0.302, 0.402, 0.222, 1.0, 0.2)
    # Bande adhésive surélevée
    obj.set_material("mat_tape")
    obj.add_box(-0.04, 0.402, -0.224, 0.04, 0.404, 0.224, 0.2, 1.0)
    obj.close()
    print("[OK] models/cardboard_carton.obj genere")

# 5. Modèle 3D Opérateur Logistique Industriel CEA
def generate_logistics_operator():
    with open("models/logistics_operator.mtl", "w", encoding="utf-8") as mtl:
        mtl.write("newmtl mat_boots_sole\nKd 0.05 0.05 0.05\nKs 0.05 0.05 0.05\nNs 5\n")
        mtl.write("newmtl mat_boots_leather\nKd 0.10 0.09 0.08\nKs 0.1 0.1 0.1\nNs 20\n")
        mtl.write("newmtl mat_boots_toe\nKd 0.08 0.08 0.08\nKs 0.4 0.4 0.4\nNs 60\n")
        mtl.write("newmtl mat_cargo_pants\nKd 0.12 0.16 0.24\nKs 0.05 0.05 0.05\nNs 10\n")
        mtl.write("newmtl mat_kneepads\nKd 0.06 0.06 0.08\nKs 0.1 0.1 0.1\nNs 15\n")
        mtl.write("newmtl mat_tool_belt\nKd 0.20 0.12 0.07\nKs 0.1 0.1 0.1\nNs 15\n")
        mtl.write("newmtl mat_buckle_steel\nKd 0.85 0.88 0.92\nKs 0.85 0.85 0.85\nNs 100\n")
        mtl.write("newmtl mat_hivis_orange\nKd 1.00 0.40 0.04\nKs 0.15 0.15 0.15\nNs 25\n")
        mtl.write("newmtl mat_reflective_silver\nKd 0.94 0.96 0.98\nKs 0.95 0.95 0.95\nNs 140\n")
        mtl.write("newmtl mat_sweater_navy\nKd 0.08 0.10 0.16\nKs 0.05 0.05 0.05\nNs 10\n")
        mtl.write("newmtl mat_gloves\nKd 0.12 0.38 0.65\nKs 0.2 0.2 0.2\nNs 30\n")
        mtl.write("newmtl mat_skin\nKd 0.82 0.65 0.52\nKs 0.1 0.1 0.1\nNs 10\n")
        mtl.write("newmtl mat_helmet_yellow\nKd 0.96 0.75 0.08\nKs 0.4 0.4 0.4\nNs 60\n")

    obj = OBJWriter("models/logistics_operator.obj", "logistics_operator.mtl")
    
    # Chaussures de sécurité (coquées acier, semelle crantée)
    for sign in [-1, 1]:
        cx = sign * 0.14
        # Semelle noire
        obj.set_material("mat_boots_sole")
        obj.add_box(cx - 0.065, 0.0, -0.10, cx + 0.065, 0.035, 0.18, 0.5, 0.5)
        # Corps de la chaussure
        obj.set_material("mat_boots_leather")
        obj.add_box(cx - 0.060, 0.035, -0.08, cx + 0.060, 0.12, 0.14, 0.5, 0.5)
        # Embout de protection coquille avant
        obj.set_material("mat_boots_toe")
        obj.add_box(cx - 0.055, 0.035, 0.08, cx + 0.055, 0.10, 0.17, 0.5, 0.5)
        
        # Jambes & Pantalon cargo de travail (renforts genoux)
        obj.set_material("mat_cargo_pants")
        obj.add_box(cx - 0.075, 0.12, -0.09, cx + 0.075, 0.85, 0.09, 1.0, 2.0)
        # Genouillère de protection
        obj.set_material("mat_kneepads")
        obj.add_box(cx - 0.080, 0.40, 0.07, cx + 0.080, 0.55, 0.10, 0.5, 0.5)
        # Poche cargo latérale
        obj.set_material("mat_cargo_pants")
        obj.add_box(sign * 0.21, 0.52, -0.06, sign * 0.23, 0.68, 0.06, 0.5, 0.5)

    # Bassin & Ceinture porte-outils
    obj.set_material("mat_cargo_pants")
    obj.add_box(-0.23, 0.85, -0.12, 0.23, 1.00, 0.12, 1.0, 0.5)
    obj.set_material("mat_tool_belt")
    obj.add_box(-0.24, 0.94, -0.13, 0.24, 1.01, 0.13, 1.0, 0.2)
    # Boucle de ceinture acier
    obj.set_material("mat_buckle_steel")
    obj.add_box(-0.04, 0.95, 0.13, 0.04, 1.00, 0.14, 0.2, 0.2)
    
    # Torse & Gilet de sécurité Haute-Visibilité (EPI Classe 2 ISO 20471)
    obj.set_material("mat_hivis_orange")
    obj.add_box(-0.25, 1.00, -0.14, 0.25, 1.48, 0.14, 1.0, 1.2)
    
    # Bandes rétroréfléchissantes horizontales (argentées micro-prismes)
    obj.set_material("mat_reflective_silver")
    obj.add_box(-0.254, 1.12, -0.144, 0.254, 1.18, 0.144, 1.0, 0.1)
    obj.add_box(-0.254, 1.30, -0.144, 0.254, 1.36, 0.144, 1.0, 0.1)
    # Bandes rétroréfléchissantes verticales bretelles
    for sign in [-1, 1]:
        obj.set_material("mat_reflective_silver")
        obj.add_box(sign * 0.14 - 0.03, 1.18, -0.144, sign * 0.14 + 0.03, 1.48, 0.144, 0.1, 0.5)

    # Bras, manches et gants de manutention
    for sign in [-1, 1]:
        arm_x = sign * 0.29
        # Épaule & manche gilet
        obj.set_material("mat_hivis_orange")
        obj.add_box(arm_x - 0.06, 1.36, -0.09, arm_x + 0.06, 1.48, 0.09, 0.5, 0.5)
        # Manche sous-pull bleu marine
        obj.set_material("mat_sweater_navy")
        obj.add_box(arm_x - 0.055, 1.08, -0.08, arm_x + 0.055, 1.36, 0.08, 0.5, 1.0)
        obj.add_box(arm_x - 0.050, 0.88, -0.075, arm_x + 0.050, 1.08, 0.075, 0.5, 1.0)
        # Gants de travail antidérapants nitrile
        obj.set_material("mat_gloves")
        obj.add_box(arm_x - 0.045, 0.74, -0.065, arm_x + 0.045, 0.88, 0.065, 0.5, 0.5)

    # Cou & Tête
    obj.set_material("mat_skin")
    obj.add_box(-0.07, 1.48, -0.07, 0.07, 1.56, 0.07, 0.5, 0.5)
    obj.add_box(-0.10, 1.56, -0.11, 0.10, 1.72, 0.11, 0.8, 0.8)
    
    # Casque de protection chantier CEA (Calotte arrondie + Visière pare-chocs)
    obj.set_material("mat_helmet_yellow")
    obj.add_box(-0.13, 1.68, -0.14, 0.13, 1.83, 0.14, 1.0, 1.0)
    # Visière frontale
    obj.add_box(-0.11, 1.68, 0.13, 0.11, 1.71, 0.19, 0.8, 0.2)
    # Nervure centrale de renfort
    obj.add_box(-0.025, 1.74, -0.15, 0.025, 1.85, 0.15, 0.2, 1.0)

    obj.close()
    print("[OK] models/logistics_operator.obj genere avec materiaux multi-surfaces")

generate_euro_pallet()
generate_bott_cabinet()
generate_kf40_flange()
generate_cardboard_carton()
generate_logistics_operator()
