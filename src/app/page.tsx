
"use client";

import React, { useState, useEffect } from 'react';
import type { Student, Teacher } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeacherLeaderboard } from '@/components/teacher-leaderboard';
import { SchoolProgress } from '@/components/school-progress';
import { ClassPieChart } from '@/components/class-pie-chart';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { UserCog, PieChart as PieChartIcon } from 'lucide-react'; // Renamed PieChart to PieChartIcon
import { useToast } from '@/hooks/use-toast';
import { getStudents, getTeachers } from '@/services/firestoreService'; // Import Firestore services
// import { onSnapshot, collection } from 'firebase/firestore'; // For real-time updates (optional future enhancement)
// import { db } from '@/lib/firebase'; // For real-time updates (optional future enhancement)


export default function Home() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch data from Firestore
        const [fetchedStudents, fetchedTeachers] = await Promise.all([
          getStudents(),
          getTeachers()
        ]);
        setStudents(fetchedStudents);
        setTeachers(fetchedTeachers);

      } catch (err: any) {
        console.error("Error loading data from Firestore for main page:", err);
        setError(err.message || "Veriler yüklenirken bir hata oluştu.");
        setStudents([]);
        setTeachers([]);
        toast({
          title: "Veri Yükleme Hatası!",
          description: err.message || "Veriler yüklenemedi. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin. Gerekirse Admin Panelinden veri yükleyin.",
          variant: "destructive",
          duration: 7000,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    // Optional: Real-time updates using onSnapshot (more complex setup)
    /*
    const studentsUnsubscribe = onSnapshot(collection(db, "students"), 
      (snapshot) => {
        setStudents(snapshot.docs.map(doc => doc.data() as Student));
        setIsLoading(false); // Adjust loading logic if using onSnapshot for both
      },
      (err) => {
        console.error("Firestore (students) real-time error:", err);
        setError("Öğrenci verileri alınırken hata oluştu.");
        setIsLoading(false);
      }
    );

    const teachersUnsubscribe = onSnapshot(collection(db, "teachers"), 
      (snapshot) => {
        setTeachers(snapshot.docs.map(doc => doc.data() as Teacher));
      },
      (err) => {
        console.error("Firestore (teachers) real-time error:", err);
        setError("Öğretmen verileri alınırken hata oluştu.");
      }
    );

    return () => {
      studentsUnsubscribe();
      teachersUnsubscribe();
    };
    */
    
    // Initial load
    loadData();

  }, [toast]);

  const teachersWithPercentage = React.useMemo(() => {
    const studentsByTeacher: Record<string, Student[]> = students.reduce((acc, student) => {
      if (!acc[student.teacherName]) {
        acc[student.teacherName] = [];
      }
      acc[student.teacherName].push(student);
      return acc;
    }, {} as Record<string, Student[]>);

    return teachers.map(teacher => {
      const teacherStudents = studentsByTeacher[teacher.name] || [];
      const studentCount = teacherStudents.length;
      if (studentCount === 0) return { ...teacher, renewalPercentage: 0, studentCount: 0 };
      const renewedCount = teacherStudents.filter(student => student.renewed).length;
      const renewalPercentage = Math.round((renewedCount / studentCount) * 100);
      return { ...teacher, renewalPercentage, studentCount };
    }).sort((a, b) => b.renewalPercentage - a.renewalPercentage);
  }, [teachers, students]);

  const overallStats = React.useMemo(() => {
    const totalStudentCount = students.length;
    if (totalStudentCount === 0) return { totalStudentCount: 0, renewedStudentCount: 0, notRenewedStudentCount: 0, overallPercentage: 0 };

    const renewedStudentCount = students.filter(student => student.renewed).length;
    const notRenewedStudentCount = totalStudentCount - renewedStudentCount;
    const overallPercentage = Math.round((renewedStudentCount / totalStudentCount) * 100);

    return { totalStudentCount, renewedStudentCount, notRenewedStudentCount, overallPercentage };
  }, [students]);

  const classRenewalStats = React.useMemo(() => {
    if (students.length === 0) return [];

    const statsByClass: Record<string, { renewed: number; notRenewed: number }> = {};

    students.forEach(student => {
      const className = student.className || "Belirtilmemiş";
      if (!statsByClass[className]) {
        statsByClass[className] = { renewed: 0, notRenewed: 0 };
      }
      if (student.renewed) {
        statsByClass[className].renewed++;
      } else {
        statsByClass[className].notRenewed++;
      }
    });

    return Object.entries(statsByClass)
      .map(([className, counts]) => ({
        name: className === "Belirtilmemiş" ? className : `${className}. Sınıflar`,
        renewed: counts.renewed,
        notRenewed: counts.notRenewed,
      }))
      .sort((a, b) => {
        if (a.name === "Belirtilmemiş") return 1;
        if (b.name === "Belirtilmemiş") return -1;
        const aNum = parseInt(a.name);
        const bNum = parseInt(b.name);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return a.name.localeCompare(b.name);
      });
  }, [students]);

  return (
    <div className="min-h-screen bg-secondary p-4 md:p-8 flex flex-col">
      <div className="flex-grow">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-3 flex-shrink-0">
            <Image
              src="/vildan_star_logo.png"
              alt="Vildan Koleji Logo"
              width={40}
              height={40}
              className="rounded-full object-cover"
              data-ai-hint="logo school"
            />
            <h1 className="text-2xl md:text-3xl font-bold text-primary">
              Kayıt <span className="text-vildan-burgundy">Takip</span>
              <span className="block text-sm md:inline md:ml-2 text-muted-foreground font-normal">Vildan Koleji Ortaokulu</span>
            </h1>
          </div>
          <div className="w-full md:w-auto text-center md:text-right mt-2 md:mt-0">
            <p className="text-xs sm:text-sm text-muted-foreground italic">
              "İşini severek yapanlar çalışmak zorunda kalmazlar"
            </p>
          </div>
        </header>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md mb-6" role="alert">
            <p className="font-medium">Hata!</p>
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 md:w-1/3 mb-2" />
                <Skeleton className="h-4 w-full md:w-2/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 md:w-1/3 mb-2" />
                <Skeleton className="h-4 w-full md:w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-6 w-1/2 mx-auto" />
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
              <CardHeader>
                <CardTitle>Öğretmenler Kayıt Takip</CardTitle>
                <CardDescription>Öğretmenlerin sorumlu oldukları öğrencilerin kayıt yenileme yüzdelerine göre sıralaması. Detayları görmek için öğretmen adına tıklayın.</CardDescription>
              </CardHeader>
              <CardContent>
                {teachersWithPercentage.length > 0 || students.length > 0 ? ( // Show even if only students (e.g. if teachers haven't been assigned to all yet)
                  <TeacherLeaderboard teachers={teachersWithPercentage} />
                ) : (
                  <p className="text-muted-foreground text-center py-4">Liderlik tablosunu görmek için lütfen Admin Panelinden Excel dosyasını yükleyin.</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
              <CardHeader>
                <CardTitle>Okul Geneli Kayıt Yenileme Durumu</CardTitle>
                <CardDescription>Tüm okula ait toplam öğrenci sayısı ve kayıt yenileme yüzdesi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex justify-center">
                  {overallStats.totalStudentCount > 0 ? (
                    <SchoolProgress
                      totalStudents={overallStats.totalStudentCount}
                      renewedStudents={overallStats.renewedStudentCount}
                    />
                  ) : (
                    <p className="text-muted-foreground text-center py-4">Okul geneli ilerlemesini görmek için lütfen Admin Panelinden Excel dosyasını yükleyin.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {overallStats.totalStudentCount > 0 && classRenewalStats.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center space-x-2 mb-4 px-1">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold text-primary">Sınıf Bazlı Yenileme Dağılımı</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {classRenewalStats.map((classStat) => (
                    <ClassPieChart
                      key={classStat.name}
                      classLevelName={classStat.name}
                      chartData={{ renewed: classStat.renewed, notRenewed: classStat.notRenewed }}
                    />
                  ))}
                </div>
              </div>
            )}
            {overallStats.totalStudentCount > 0 && classRenewalStats.length === 0 && !isLoading && (
              <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <CardHeader>
                  <CardTitle>Sınıf Bazlı Kayıt Durumu</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-4">Sınıf bazlı grafik için öğrenci verilerinde sınıf bilgisi bulunmalıdır.</p>
                </CardContent>
              </Card>
            )}

          </div>
        )}
      </div>
      <div className="mt-auto pt-8 flex justify-center">
        <Link href="/admin" passHref legacyBehavior>
          <Button variant="outline" size="sm">
            <UserCog className="mr-2 h-4 w-4" />
            A.Paneli
          </Button>
        </Link>
      </div>
    </div>
  );
}
