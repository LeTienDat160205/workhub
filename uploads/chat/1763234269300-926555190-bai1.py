"""
Bài 1: Bài toán đong nước (4 lít và 3 lít)

Mô tả:
 - Hai bình: bình A (4 lít), bình B (3 lít). Không có chia vạch.
 - Trạng thái được biểu diễn bằng cặp số nguyên (x, y),
   trong đó x là số lít trong bình 4L, y là số lít trong bình 3L.
 - Trạng thái ban đầu: (0, 0).
 - Mục tiêu: có chính xác 2 lít trong bình 4L (x == 2).

Giải pháp này tìm đường đi ngắn nhất (theo số bước) sử dụng BFS.
Các phép biến đổi (luật) được cài dưới dạng các hành động: đổ đầy, đổ ra ngoài, và rót giữa hai bình.

File này in ra dãy trạng thái và hành động để đạt được mục tiêu, cùng với số bước.
"""

from collections import deque
from typing import Tuple, Dict, List, Optional

# Dung tích các bình
CAP_A = 4  # bình 4 lít
CAP_B = 3  # bình 3 lít

State = Tuple[int, int]


def successors(state: State) -> List[Tuple[State, str]]:
    """Trả về danh sách các trạng thái kề (state', action) có thể đạt được từ state.

    Các hành động (mô tả bằng chuỗi) bao gồm:
    - 'Fill A'  : đổ đầy bình A (4L)
    - 'Fill B'  : đổ đầy bình B (3L)
    - 'Empty A' : đổ hết bình A
    - 'Empty B' : đổ hết bình B
    - 'Pour A->B': rót từ A sang B cho tới khi A cạn hoặc B đầy
    - 'Pour B->A': rót từ B sang A cho tới khi B cạn hoặc A đầy
    """
    x, y = state
    res: List[Tuple[State, str]] = []

    # Luật 1: Fill A nếu chưa đầy
    if x < CAP_A:
        res.append(((CAP_A, y), 'Fill A'))

    # Luật 2: Fill B nếu chưa đầy
    if y < CAP_B:
        res.append(((x, CAP_B), 'Fill B'))

    # Luật 3: Empty A nếu có nước
    if x > 0:
        res.append(((0, y), 'Empty A'))

    # Luật 4: Empty B nếu có nước
    if y > 0:
        res.append(((x, 0), 'Empty B'))

    # Luật 5/6: Pour A -> B
    if x > 0 and y < CAP_B:
        amount = min(x, CAP_B - y)
        new_x = x - amount
        new_y = y + amount
        res.append(((new_x, new_y), 'Pour A->B'))

    # Luật 7/8: Pour B -> A
    if y > 0 and x < CAP_A:
        amount = min(y, CAP_A - x)
        new_x = x + amount
        new_y = y - amount
        res.append(((new_x, new_y), 'Pour B->A'))

    return res


def bfs_search(start: State, goal_test) -> Optional[Dict]:
    """Tìm đường đi ngắn nhất từ start tới trạng thái thỏa goal_test bằng BFS.

    Trả về dictionary chứa parent và action nếu tìm được, ngược lại None.
    parent: map state -> parent_state
    action: map state -> action_taken_from_parent_to_state
    """
    queue = deque([start])
    visited = set([start])
    parent: Dict[State, State] = {}
    action: Dict[State, str] = {}

    while queue:
        s = queue.popleft()
        if goal_test(s):
            return {'parent': parent, 'action': action, 'goal': s}

        for (s2, act) in successors(s):
            if s2 not in visited:
                visited.add(s2)
                parent[s2] = s
                action[s2] = act
                queue.append(s2)

    return None


def reconstruct_path(parent: Dict[State, State], action: Dict[State, str], start: State, goal: State):
    """Truy vết đường từ start tới goal, trả về list trạng thái và list hành động tương ứng."""
    path: List[State] = []
    acts: List[str] = []
    cur = goal
    while cur != start:
        path.append(cur)
        acts.append(action[cur])
        cur = parent[cur]
    path.append(start)
    path.reverse()
    acts.reverse()
    return path, acts


def print_solution(path: List[State], actions: List[str]) -> None:
    print("Giải pháp (state = (A_4L, B_3L)):")
    for i, state in enumerate(path):
        if i == 0:
            print(f" {i:2d}: {state}  (Start)")
        else:
            print(f" {i:2d}: {state}  <- {actions[i-1]}")
    print(f"Số bước: {len(actions)}")


if __name__ == '__main__':
    start_state: State = (0, 0)

    # Điều kiện mục tiêu: bình A (4L) có đúng 2 lít
    def goal_test(s: State) -> bool:
        x, y = s
        return x == 2

    print("Bài toán đong nước: bình A 4L và bình B 3L")
    print("Trạng thái ban đầu:", start_state)
    print("Tìm dãy hành động để có đúng 2 lít trong bình 4L (A)")

    result = bfs_search(start_state, goal_test)
    if result is None:
        print("Không tìm thấy lời giải.")
    else:
        parent = result['parent']
        action = result['action']
        goal_state = result['goal']
        path, acts = reconstruct_path(parent, action, start_state, goal_state)
        print_solution(path, acts)
