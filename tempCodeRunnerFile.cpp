#include<stdio.h>
using namespace std;
template <typename T>
class Add
{
    T a,b;
    public:
     void getdata(T x,T y)
     {
         a=x;
         b=y;
     }
     void show sum()
     {
         cout<<"sum="<<a+b<<endl;
     }
};
int main()
{
    Add<int> a1;
    obj1.getdata(10,20);
    obj1.showSum();
    Add<float> a2;
    obj2.getdata(10.5,20.5);
    obj2.showSum();
    return 0;
}