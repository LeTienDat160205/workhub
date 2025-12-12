from collections import defaultdict

# ===== 1. LỚP NODE =====
class Node:
    def __init__(self, ten, Cha=None):
        self.ten = ten
        self.Cha = Cha


# ===== 2. CẤU TRÚC ĐỒ THỊ =====
data = defaultdict(list)
data['A'] = ['B', 'C', 'D']
data['B'] = ['M', 'N']
data['C'] = ['L']
data['D'] = ['O', 'P']
data['M'] = ['X', 'Y']
data['N'] = ['U', 'V']
data['O'] = ['I', 'J']
data['Y'] = ['R', 'S']
data['V'] = ['G', 'H']


# ===== 3. HÀM PHỤ =====
def kiemTra(tam, MO):
    for v in MO:
        if v.ten == tam.ten:
            return True
    return False

def DuongDi(n):
    if n is not None:
        print(n.ten, end=" ")
        DuongDi(n.Cha)


# ===== 4. THUẬT TOÁN DFS =====
def DFS(T0, Tg):
    MO = []     # OPEN list
    DONG = []   # CLOSED list
    
    MO.append(T0)
    
    while MO:
        n = MO.pop()  # <-- LẤY Ở CUỐI DANH SÁCH (DFS)
        
        if n.ten == Tg.ten:
            print("\n✅ Tìm thấy đường đi!")
            print("Đường đi từ", Tg.ten, "về gốc là:")
            DuongDi(n)
            return
        
        DONG.append(n)
        
        # Duyệt các node con
        for v in data[n.ten]:
            tam = Node(v, n)
            if not kiemTra(tam, MO) and not kiemTra(tam, DONG):
                MO.append(tam)  # thêm vào cuối để đi sâu
        
    print("\n❌ Không tìm thấy đường đi!")


# ===== 5. CHẠY CHƯƠNG TRÌNH =====
def main():
    print("=" * 60)
    print("BÀI TOÁN TÌM KIẾM THEO CHIỀU SÂU (DFS)")
    print("=" * 60)
    
    T0 = Node('A')
    Tg = Node('R')
    
    DFS(T0, Tg)
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()