import { useState, useEffect } from 'react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { dashboardApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './FacilityReportsPage.module.css'

const COLORS = ['#2563EB','#16A34A','#D97706','#7C3AED','#DB2777']

const FALLBACK_VOLUME  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>({date:d,patients:[185,202,178,231,248,215,226][i]}))
const FALLBACK_HOURLY  = ['8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM'].map((h,i)=>({hour:h,count:[22,48,61,54,38,42,51,45,30,15][i]}))
const FALLBACK_DIST    = [{name:'General 35%',value:35,color:'#2563EB'},{name:'Pre-natal 22%',value:22,color:'#16A34A'},{name:'Immunization 18%',value:18,color:'#D97706'},{name:'Family Planning 15%',value:15,color:'#7C3AED'},{name:'Other 10%',value:10,color:'#DB2777'}]
const FALLBACK_INSIGHTS = [
  {type:'warning',title:'Peak Hour Bottleneck',desc:'Queue volume spikes at 10 AM — consider adding morning triage staff.'},
  {type:'success',title:'Completion Rate Excellent',desc:'92.3% completion rate this week — above the 85% regional benchmark.'},
  {type:'info',title:'Optimize Slot Distribution',desc:'Review your time slot allocation to match peak hours.'},
]

export default function FacilityReportsPage() {
  const { user } = useAuth()
  const [stats,   setStats]   = useState(null)
  const [range,   setRange]   = useState('Last 7 Days')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.facility(user?.clinicId)
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [user?.clinicId])

  const volumeData  = stats?.weeklyTrend?.map(w => ({ date: w.day, patients: w.count })) || FALLBACK_VOLUME
  const hourlyData  = stats?.hourlyData  || FALLBACK_HOURLY
  const distData    = stats?.serviceDist?.length
    ? stats.serviceDist.map((s,i) => ({ name: s._id, value: s.count, color: COLORS[i % COLORS.length] }))
    : FALLBACK_DIST
  const insights    = stats?.insights    || FALLBACK_INSIGHTS

  const completionRate = stats?.completionRate ?? 92.3
  const totalToday     = stats?.todayPatients  ?? 248
  const avgWait        = stats?.avgWaitTime    ?? 22

  return (
    <div className={styles.page}>
      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.pageTitle}>Analytics & Reports</div>
        <div style={{display:'flex',gap:8}}>
          <select className="dropdown-select" value={range} onChange={e=>setRange(e.target.value)}>
            {['Last 7 Days','Last 30 Days','Last 3 Months'].map(r=><option key={r}>{r}</option>)}
          </select>
          <button className="btn btn-outline btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className={styles.statsRow}>
        <MiniStat label="Total Patients Today" value={loading?'…':totalToday} color="blue" />
        <MiniStat label="Avg. Wait Time"        value={loading?'…':`${avgWait}m`} color="green" />
        <MiniStat label="Completion Rate"       value={loading?'…':`${completionRate}%`} color="purple" />
        <MiniStat label="Services Active"       value={loading?'…':distData.length} color="orange" />
      </div>

      {/* Volume + Hourly */}
      <div className={styles.row2}>
        <div className={"card " + styles.chartCard}>
          <div className={styles.chartTitle}>Daily Patient Volume</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={volumeData} margin={{top:8,right:8,left:-18,bottom:4}}>
              <defs>
                <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize:11}} />
              <YAxis tick={{fontSize:11}} allowDecimals={false} />
              <Tooltip contentStyle={{borderRadius:8,fontSize:12}} />
              <Area type="monotone" dataKey="patients" stroke="#2563EB" strokeWidth={2.5} fill="url(#vol)" name="Patients" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={"card " + styles.chartCard}>
          <div className={styles.chartTitle}>Hourly Queue Volume</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyData} margin={{top:8,right:8,left:-18,bottom:4}}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" tick={{fontSize:10}} />
              <YAxis tick={{fontSize:11}} allowDecimals={false} />
              <Tooltip contentStyle={{borderRadius:8,fontSize:12}} />
              <Bar dataKey="count" fill="#7C3AED" radius={[3,3,0,0]} name="Patients" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service dist + Insights */}
      <div className={styles.row2}>
        <div className={"card " + styles.pieCard}>
          <div className={styles.chartTitle}>Service Distribution</div>
          <div style={{display:'flex',alignItems:'center',gap:20}}>
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={distData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                  {distData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                </Pie>
                <Tooltip contentStyle={{borderRadius:8,fontSize:12}} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
              {distData.map(d=>(
                <div key={d.name} style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:9,height:9,borderRadius:'50%',background:d.color,display:'inline-block',flexShrink:0}} />
                  <span style={{flex:1,fontSize:12,color:'var(--muted)'}}>{d.name}</span>
                  <span style={{fontSize:12,fontWeight:700}}>{d.value}{typeof d.value==='number'&&d.value<100?'%':''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={"card " + styles.insightsCard}>
          <div className={styles.chartTitle}>AI Recommendations</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {insights.map((ins,i)=>(
              <div key={i} className={`${styles.insight} ${styles['insight_'+ins.type]}`}>
                <div className={styles.insightTitle}>{ins.title}</div>
                <div className={styles.insightDesc}>{ins.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }) {
  const fg = {blue:'#2563EB',green:'#16A34A',purple:'#7C3AED',orange:'#D97706'}
  const bg = {blue:'#EFF6FF',green:'#ECFDF5',purple:'#F5F3FF',orange:'#FFF7ED'}
  return (
    <div className={"card " + styles.miniStat}>
      <div style={{width:32,height:32,borderRadius:8,background:bg[color],display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={fg[color]} strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
      </div>
      <div style={{fontSize:24,fontWeight:800,color:'var(--text)'}}>{value}</div>
      <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{label}</div>
    </div>
  )
}
