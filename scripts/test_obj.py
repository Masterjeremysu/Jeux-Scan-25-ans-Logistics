import os

def create_obj_box(f, x0, y0, z0, x1, y1, z1, start_idx):
    # 8 vertices of a box
    verts = [
        (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
        (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)
    ]
    for v in verts:
        f.write(f"v {v[0]:.4f} {v[1]:.4f} {v[2]:.4f}\n")
    
    # Faces (front, back, left, right, top, bottom)
    faces = [
        (1, 2, 3, 4), # back
        (5, 8, 7, 6), # front
        (1, 5, 6, 2), # bottom
        (4, 3, 7, 8), # top
        (1, 4, 8, 5), # left
        (2, 6, 7, 3), # right
    ]
    for face in faces:
        f.write(f"f {face[0]+start_idx} {face[1]+start_idx} {face[2]+start_idx} {face[3]+start_idx}\n")
    return start_idx + 8

print("OBJ generator script ready.")
