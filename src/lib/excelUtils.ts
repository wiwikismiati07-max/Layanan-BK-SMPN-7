import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string, title: string = 'LAPORAN AGENDA KERJA BK') => {
  const dateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // 1. Prepare HeaderRows (Kop Surat)
  const header = [
    ['PEMERINTAH KOTA PASURUAN'],
    ['SMP NEGERI 7'],
    ['Jalan Simpang Slamet Riadi Nomor 2, Kota Pasuruan, Jawa Timur, Telepon (0343) 426845'],
    ['Pos-el: smp7pas@yahoo.co.id , Laman: www.smpn7pasuruan.sch'],
    [''], // Empty spacer
    [title.toUpperCase()],
    [''], // Empty spacer
  ];

  // 2. Table Header
  const tableHeader = [['NO', 'TANGGAL', 'KEGIATAN 1', 'KEGIATAN 2', 'KEGIATAN 3', 'KEGIATAN 4', 'KEGIATAN 5', 'KEGIATAN 6', 'KEGIATAN 7', 'KEGIATAN 8', 'SASARAN', 'LINK FOTO', 'KETERANGAN']];

  // 3. Prepare Data
  const body = data.map((item, index) => {
    const activities = item.description.split(', ');
    const filledActivities = [...activities];
    while (filledActivities.length < 8) filledActivities.push('');
    
    return [
      index + 1,
      item.date,
      ...filledActivities.slice(0, 8),
      item.target,
      item.photoUrl || '-',
      item.note
    ];
  });

  // 4. Footer (Signatures)
  const footer = [
    [''],
    [''],
    ['Mengetahui,', '', '', '', '', '', '', '', '', 'Pasuruan, ' + dateStr],
    ['Kepala Sekolah', '', '', '', '', '', '', '', '', 'Guru BK'],
    [''],
    [''],
    [''],
    ['NUR FADILAH, S.Pd', '', '', '', '', '', '', '', '', '..........................................'],
    ['NIP. 19860410 201001 2 030', '', '', '', '', '', '', '', '', 'NIP. .....................................'],
  ];

  // Combine everything
  const finalData = [...header, ...tableHeader, ...body, ...footer];

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(finalData);

  // Define column widths
  worksheet['!cols'] = [
    { wch: 5 },   // NO
    { wch: 15 },  // TANGGAL
    { wch: 20 },  // KEGIATAN 1
    { wch: 20 },  // KEGIATAN 2
    { wch: 20 },  // KEGIATAN 3
    { wch: 20 },  // KEGIATAN 4
    { wch: 20 },  // KEGIATAN 5
    { wch: 20 },  // KEGIATAN 6
    { wch: 20 },  // KEGIATAN 7
    { wch: 20 },  // KEGIATAN 8
    { wch: 20 },  // SASARAN
    { wch: 25 },  // LINK FOTO
    { wch: 30 },  // KETERANGAN
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const parseExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      resolve(json);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
