#include <iostream>
#define MAX 100
using namespace std;

struct SinhVien {
	char msv[10];
	char hoVaTen[50];
	float diem;
};

//struct List {
//	SinhVien sv[MAX];
//	int count;
//};
//
SinhVien nhapSV() {
	SinhVien sv;
	cin.ignore();  
	cout << "Nhap MSV: ";
	cin.getline(sv.msv, 10);
	cout << "Nhap ho va ten: ";
	cin.getline(sv.hoVaTen, 50);
	cout << "Nhap diem: ";
	cin >> sv.diem;
	return sv;
}

void nhapDSSV(List &L) {
	L.count = 0;
	int n;
	cout << "Nhap so luong: ";
	cin >> n;
	for (int i = 0; i < n; i++) {
		cout << "Nhap sinh vien thu " << (i + 1) << endl;
		L.sv[L.count++] = nhapSV();
	}
}

void chenSV(List &L, SinhVien sv, int k){
	if(k<=L.count+1 && k>=0 && L.count!=MAX){
		for(int i=L.count; i>=k-1; i--){
			L.sv[i+1] = L.sv[i];
		}
		L.sv[k-1] = sv;
		L.count++;
	} else{
		cout << "Theem khong thanh cong " <<endl;
	}
}

void xoaSV(List &L, int k){
	if(l<=L.count+1 && k>=0){
		for(int i=k; i<=L.count; i++){
			L.sv[i-1] = L.sv[i];
		}
		L.count--;s
	} else{
		cout<<"Xoa khong thanh cong";
	}
}

struct Node{
	SinhVien infor;
	Node *next;
};
typedef Node *TRO;

void themSV(TRO &L){
	SinhVien sv = nhapSV();
	TRO Q = L;
	TRO P = new Node;
	P->infor = sv;
	P->next = NULL;
	if(L == NULL){
		L = P;
	}else{
		while(Q->next != NULL){
			Q = Q->next;
		}
		Q->next = P;
	}
}

void taoDSSV(TRO &L){
	int n;
	cout << "Nhap so luong SV: ";
	cin >> n;
	for(int i=1; i<=n; i++){
		themSV(L);
	}
}

void chenSV(TRO &L,SinhVien sv, int k){
	TRO P, Q, M;
	P = new Node;
	P->infor = sv;
	M = L;
	int d=1;
	while(d < k-1){
		M = M->next;
		d++;
	}
	Q = M->next;
	M->next = P;
	P->next = Q;
}

void xoaSV(TRO &L, int k){
	TRO M, Q;
	M = L;
	int d = 1;
	while(d < k-1){
		M = M->next;
		d++;
	}
	Q = M->next;
	M->next = Q->next;
	delete Q;
}

int main() {
	List L;
	nhapDSSV(L);
	return 0;
}

