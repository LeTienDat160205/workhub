"""
At.py
Triển khai thuật toán A^T (phiên bản chọn nút có g nhỏ nhất = Uniform‑Cost / A* với h=0)
Tìm đường từ start đến bất kỳ đỉnh trong goals; in đường đi và chi phí.

Đồ thị (theo đề):
 A->B:2, A->C:4, A->F:6
 C->D:8, C->E:2
 F->G:5, F->H:1

"""

from math import inf

# Đồ thị có trọng số (dictionary of dict)
graph = {
    'A': {'B': 2, 'C': 4, 'F': 6},
    'B': {},
    'C': {'D': 8, 'E': 2},
    'D': {},
    'E': {},
    'F': {'G': 5, 'H': 1},
    'G': {},
    'H': {}
}


def print_path_and_cost(start, goal, parent, g):
    """In đường đi từ start tới goal theo parent và in tổng chi phí g[goal]."""
    path = []
    current = goal
    while current != start:
        path.append(current)
        current = parent.get(current)
        if current is None:
            # Không có đường
            print(f"Không thể reconstruct đường tới {goal}")
            return
    path.append(start)
    path.reverse()
    print("Đường đi:", ' -> '.join(path))
    print("C(p) =", g[goal])


def AT(graph, start, goals):
    """
    A^T / Uniform-Cost search: chọn nút n trong MO có chi phí g(n) nhỏ nhất.
    Trả về True nếu tìm thấy đích (in đường + chi phí), ngược lại False.
    """
    MO = [start]            # các đỉnh đã được duyệt
    g = {start: 0}          # chi phí từ start tới mỗi đỉnh (nếu biết)
    DONG = []               # các đỉnh đã xét xong
    parent = {}             # lưu trữ cha của mỗi đỉnh

    found = {}
    while MO and len(found) < len(goals):
        # Lấy đỉnh n có chi phí g(n) nhỏ nhất trong MO
        min_cost = float('inf')
        n = None
        for vertex in MO:
            cost = g.get(vertex, float('inf'))
            if cost < min_cost:
                min_cost = cost
                n = vertex

        # Nếu n là một trong các đích và chưa ghi lại thì lưu kết quả
        if n in goals and n not in found:
            path = []
            cur = n
            while cur is not None:
                path.append(cur)
                cur = parent.get(cur)
            path.reverse()
            found[n] = (path, g.get(n, float('inf')))

        MO.remove(n)  # xóa n khỏi MO
        DONG.append(n) # thêm n vào tập đã xét 

        # Duyệt qua các kề của n
        for m, w in graph.get(n, {}).items():
            new_cost = g.get(n, float('inf')) + w

            # Nếu m đã có cha và đường đi mới ngắn hơn
            if m in parent and new_cost < g.get(m, float('inf')):
                g[m] = new_cost
                parent[m] = n

            # Nếu m chưa được duyệt
            elif m not in MO and m not in DONG:
                g[m] = new_cost
                parent[m] = n
                MO.append(m)

    return found


def main():
    start = 'A'
    goals = ['D', 'H']
    results = AT(graph, start, set(goals))

    # Chỉ in đáp án (đường đi và chi phí) cho từng đích
    for t in goals:
        if t in results:
            path, cost = results[t]
            print(f"Đường từ {start} tới {t}: ", end='')
            print(f"{start} -> {t}: {' -> '.join(path)} (chi phí = {cost})")
        else:
            print(f"Không tìm thấy đường từ {start} tới {t}")


if __name__ == '__main__':
    main()