"""
At1.py

Ví dụ: Tìm đường đi từ T0 = A tới tập đích TG = {D, H} theo phương pháp AT (tương tự tìm kiếm theo chi phí nhỏ nhất / uniform-cost).

Tệp này chứa:
- định nghĩa đồ thị dưới dạng dictionary
- hàm `print_path_and_cost` để in đường đi tìm được và chi phí
- hàm `AT` (danh sách MO = mở / DONG = đóng) cài theo slide
- khối `__main__` để chạy ví dụ và kiểm tra kết quả

Chú thích bằng tiếng Việt kèm giải thích từng bước.
"""

from typing import Dict, List, Any


# Định nghĩa đồ thị theo đề bài (theo slide):
# mỗi đỉnh map tới dict các đỉnh kề và chi phí (trọng số) của cạnh
graph: Dict[str, Dict[str, int]] = {
	"A": {"B": 2, "C": 4, "F": 6},
	"B": {},
	"C": {"D": 8, "E": 2},
	"D": {},
	"E": {},
	"F": {"G": 5, "H": 1},
	"G": {},
	"H": {},
}


def print_path_and_cost(start: str, goal: str, parent: Dict[str, str], g: Dict[str, float]) -> None:
	"""In đường đi từ start tới goal dựa trên dictionary parent và in chi phí g[goal].

	Truy vết parent từ goal ngược về start, sau đó đảo lại để in theo thứ tự đi.
	"""
	path: List[str] = []
	current = goal
	# Truy ngược cha tới khi gặp start (nếu không gặp sẽ KeyError => lỗi dữ liệu)
	try:
		while current != start:
			path.append(current)
			current = parent[current]
	except KeyError:
		# Nếu không thể truy vết về start thì thông báo (không hợp lệ)
		print(f"Không thể truy vết đường từ {start} tới {goal}. parent thiếu thông tin.")
		return

	path.append(start)
	path.reverse()
	print("Đường đi:", ' -> '.join(path))
	print("C(p) =", g.get(goal, float('inf')))


def AT(graph: Dict[str, Dict[str, int]], start: str, goals: List[str]) -> bool:
	"""Tìm đường tới một trong các đích trong `goals` theo phương pháp AT (chi phí nhỏ nhất).

	Ý tưởng (theo slide):
	- MO: danh sách các đỉnh đang mở (chưa xét), ban đầu chứa start
	- DONG: danh sách các đỉnh đã xét xong
	- g: dictionary lưu chi phí nhỏ nhất đã biết đến mỗi đỉnh (g[start]=0)
	- parent: lưu cha để truy vết đường

	Hàm trả về True nếu tìm được đường đến một trong `goals` (và in đường + chi phí),
	ngược lại trả về False.
	"""

	# MO: danh sách đỉnh chờ xét
	MO: List[str] = [start]
	# g: chi phí tới từng đỉnh (g[start] = 0)
	g: Dict[str, float] = {start: 0}
	# DONG: đã xét
	DONG: List[str] = []
	# parent: lưu cha
	parent: Dict[str, str] = {}

	# Lặp cho tới khi không còn đỉnh nào trong MO
	while MO:
		# Chọn n trong MO có chi phí g(n) nhỏ nhất
		min_cost = float('inf')
		n = None
		for vertex in MO:
			cost = g.get(vertex, float('inf'))
			if cost < min_cost:
				min_cost = cost
				n = vertex

		# Nếu không tìm được n hợp lệ (vô lý) thì dừng
		if n is None:
			break

		# Nếu n là một trong các đích -> in đường và trả về True
		if n in goals:
			print_path_and_cost(start, n, parent, g)
			return True

		# Chuyển n từ MO sang DONG (đã xét xong)
		MO.remove(n)
		DONG.append(n)

		# Duyệt các đỉnh kề m của n
		for m, cost_nm in graph.get(n, {}).items():
			# chi phí mới tới m khi đi qua n
			new_cost = g.get(n, float('inf')) + cost_nm

			# Nếu m đã có parent (đã được khám phá) và đường mới ngắn hơn => cập nhật
			if m in parent and new_cost < g.get(m, float('inf')):
				g[m] = new_cost
				parent[m] = n

			# Nếu m chưa xuất hiện trong cả MO và DONG => thêm vào MO
			elif m not in MO and m not in DONG:
				g[m] = new_cost
				parent[m] = n
				MO.append(m)

			# Nếu m đã trong MO nhưng new_cost nhỏ hơn, cập nhật chi phí (giữ parent)
			elif m in MO and new_cost < g.get(m, float('inf')):
				g[m] = new_cost
				parent[m] = n

	# Không tìm thấy đường tới bất kỳ đích nào
	print("Không tìm thấy đường tới bất kỳ đích nào trong", goals)
	return False


if __name__ == '__main__':
	# Ví dụ chạy theo slide: start = A, goals = ['D','H']
	start_node = 'A'
	goal_nodes = ['D', 'H']

	print("Đồ thị:")
	for v in sorted(graph.keys()):
		print(f" {v} -> {graph[v]}")

	print('\nChạy AT với start =', start_node, 'và goals =', goal_nodes)
	AT(graph, start_node, goal_nodes)

