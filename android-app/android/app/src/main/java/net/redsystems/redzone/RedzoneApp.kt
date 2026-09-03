package net.redsystems.redzone

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import java.time.LocalTime
import java.time.format.DateTimeFormatter

private val Bg = Color(0xFF08090C)
private val Panel = Color(0xFF15171D)
private val Panel2 = Color(0xFF1C1F27)
private val Edge = Color(0xFF292C35)
private val Red = Color(0xFFFF5559)
private val DeepRed = Color(0xFF3A090C)
private val Muted = Color(0xFF9B9DA7)
private data class Sector(val name: String, val icon: ImageVector)
private val sectors = listOf(
    Sector("Início", Icons.Default.Home), Sector("Treinos", Icons.Default.FitnessCenter),
    Sector("Alimentação", Icons.Default.Restaurant), Sector("Estudos", Icons.Default.School),
    Sector("Rotina", Icons.Default.Schedule), Sector("Batalha", Icons.Default.Whatshot),
    Sector("Perfil", Icons.Default.Person)
)

@Composable fun RedzoneApp() {
    var page by remember { mutableIntStateOf(0) }
    MaterialTheme(colorScheme = darkColorScheme(primary = Red, background = Bg, surface = Panel)) {
        Scaffold(containerColor = Bg, topBar = { Header(sectors[page].name) }, bottomBar = { BottomNav(page) { page = it } }) { inset ->
            Box(Modifier.fillMaxSize().padding(inset).background(Brush.verticalGradient(listOf(DeepRed.copy(.38f), Bg), endY = 420f))) {
                when (page) {
                    0 -> Dashboard()
                    1 -> ModulePage(sectors[1], listOf("Hoje", "Plano", "Histórico"), "Treino de hoje", listOf("Aquecimento", "Exercícios", "Progresso"))
                    2 -> ModulePage(sectors[2], listOf("Hoje", "Plano", "Água"), "Alimentação de hoje", listOf("Refeições", "Água", "Metas"))
                    3 -> ModulePage(sectors[3], listOf("Hoje", "Matérias", "Relatório"), "Estudos", listOf("Próximo conteúdo", "Banco de matérias", "Horas estudadas"))
                    4 -> ModulePage(sectors[4], listOf("Hoje", "Calendário", "Alarmes"), "Rotina de hoje", listOf("Atividades", "Calendário", "Despertadores"))
                    5 -> ModulePage(sectors[5], listOf("Feed", "Conversas", "Ranking"), "Batalha", listOf("Publicações", "Mensagens", "Competições"))
                    else -> ModulePage(sectors[6], listOf("Resumo", "Conquistas", "Ajustes"), "Seu perfil", listOf("Patente", "Histórico de XP", "Configurações"))
                }
            }
        }
    }
}

@Composable private fun Header(section: String) {
    var time by remember { mutableStateOf(LocalTime.now()) }
    LaunchedEffect(Unit) { while (true) { time = LocalTime.now(); delay(1000) } }
    Surface(color = Color(0xFF0A0B0F), shadowElevation = 10.dp) {
        Row(Modifier.fillMaxWidth().statusBarsPadding().height(61.dp).padding(horizontal = 13.dp), verticalAlignment = Alignment.CenterVertically) {
            Image(painterResource(R.drawable.redzone_wordmark), "REDZONE", Modifier.width(126.dp).height(38.dp), contentScale = ContentScale.Fit)
            Spacer(Modifier.width(9.dp)); Box(Modifier.width(1.dp).height(24.dp).background(Edge)); Spacer(Modifier.width(9.dp))
            Text(section.uppercase(), color = Color.White, fontWeight = FontWeight.Black, fontSize = 13.sp, maxLines = 1)
            Spacer(Modifier.weight(1f))
            Column(horizontalAlignment = Alignment.End) {
                Text(time.format(DateTimeFormatter.ofPattern("HH:mm")), color = Color.White, fontWeight = FontWeight.Black, fontSize = 18.sp)
                Text("REDZONE", color = Red, fontWeight = FontWeight.Bold, fontSize = 8.sp)
            }
        }
    }
}

@Composable private fun BottomNav(active: Int, select: (Int) -> Unit) = Surface(color = Color(0xFF0E0F14), shadowElevation = 14.dp) {
    Row(Modifier.fillMaxWidth().navigationBarsPadding().height(67.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
        sectors.forEachIndexed { i, item ->
            val on = i == active
            Box(Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.Center) {
                IconButton({ select(i) }, Modifier.fillMaxSize()) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                        Box(Modifier.size(31.dp).clip(CircleShape).background(if (on) Red.copy(.17f) else Color.Transparent), contentAlignment = Alignment.Center) {
                            Icon(item.icon, item.name, tint = if (on) Red else Muted, modifier = Modifier.size(19.dp))
                        }
                        Text(item.name, color = if (on) Red else Muted, fontSize = 7.5.sp, fontWeight = if (on) FontWeight.Bold else FontWeight.Normal, maxLines = 1, overflow = TextOverflow.Clip)
                    }
                }
            }
        }
    }
}

@Composable private fun Dashboard() = Column(Modifier.fillMaxSize().padding(12.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
    Row(Modifier.fillMaxWidth().height(102.dp).card(), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.padding(start = 13.dp).size(78.dp), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(progress = { .025f }, color = Red, trackColor = Color.White.copy(.08f), strokeWidth = 4.dp, modifier = Modifier.fillMaxSize())
            Image(painterResource(R.drawable.avatar_masc), "Perfil", Modifier.size(66.dp).clip(CircleShape), contentScale = ContentScale.Crop)
        }
        Spacer(Modifier.width(13.dp))
        Column(Modifier.weight(1f)) {
            Text("UCHOA", color = Color.White, fontSize = 21.sp, lineHeight = 21.sp, fontWeight = FontWeight.Black)
            Text("@felipeuchoa", color = Muted, fontSize = 12.sp)
            Spacer(Modifier.height(6.dp)); Surface(color = Red.copy(.14f), border = androidx.compose.foundation.BorderStroke(1.dp, Red.copy(.28f)), shape = RoundedCornerShape(50)) { Text("▲ Recruta · 20 XP", color = Color(0xFFFF7074), fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)) }
        }
    }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
        Metric("19", "ANOS", Modifier.weight(1f)); Metric("89,0", "KG", Modifier.weight(1f)); Metric("1,78", "ALTURA", Modifier.weight(1f))
    }
    Row(Modifier.fillMaxWidth().height(73.dp).card().padding(horizontal = 13.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Default.Security, null, tint = Color(0xFFB6C7CC), modifier = Modifier.size(37.dp)); Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("Recruta  ⓘ", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Black)
            LinearProgressIndicator(progress = { .0025f }, color = Color(0xFF37D67A), trackColor = Color.White.copy(.08f), modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape))
            Text("20 XP · faltam 7.980 pra Soldado", color = Muted, fontSize = 9.sp)
        }
    }
    Text("Resumo de hoje", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(start = 2.dp))
    Column(Modifier.fillMaxWidth().weight(1f), verticalArrangement = Arrangement.spacedBy(7.dp)) {
        SummaryRow(Icons.Default.FitnessCenter, "Treino de hoje", "Nenhuma sessão concluída", 0f, Modifier.weight(1f))
        SummaryRow(Icons.Default.School, "Estudos", "Nenhum conteúdo concluído", 0f, Modifier.weight(1f))
        SummaryRow(Icons.Default.WaterDrop, "Água", "0 / 2500 ml", 0f, Modifier.weight(1f))
    }
}

private fun Modifier.card() = background(Panel, RoundedCornerShape(17.dp)).border(1.dp, Edge, RoundedCornerShape(17.dp))

@Composable private fun Metric(value: String, label: String, modifier: Modifier) = Column(modifier.height(59.dp).card(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
    Text(value, color = Color.White, fontWeight = FontWeight.Black, fontSize = 16.sp); Text(label, color = Muted, fontSize = 8.sp)
}

@Composable private fun DashboardPanel(title: String, icon: ImageVector, rows: List<String>, modifier: Modifier) = Column(modifier.card().padding(11.dp)) {
    Row(verticalAlignment = Alignment.CenterVertically) { Icon(icon, null, tint = Red, modifier = Modifier.size(17.dp)); Spacer(Modifier.width(6.dp)); Text(title, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Black) }
    Spacer(Modifier.height(8.dp)); rows.forEach { CompactRow(it) }
}

@Composable private fun SummaryRow(icon: ImageVector, title: String, subtitle: String, progress: Float, modifier: Modifier) = Row(modifier.fillMaxWidth().card().padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
    Box(Modifier.size(37.dp).background(Red.copy(.12f), RoundedCornerShape(11.dp)), contentAlignment = Alignment.Center) { Icon(icon, null, tint = Red, modifier = Modifier.size(20.dp)) }
    Spacer(Modifier.width(11.dp)); Column(Modifier.weight(1f)) {
        Text(title, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Text(subtitle, color = Muted, fontSize = 9.sp, maxLines = 1)
        LinearProgressIndicator(progress = { progress }, color = Red, trackColor = Color.White.copy(.07f), modifier = Modifier.fillMaxWidth().padding(top = 5.dp).height(4.dp).clip(CircleShape))
    }; Spacer(Modifier.width(8.dp)); Text("${(progress * 100).toInt()}%", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
}

@Composable private fun CompactRow(text: String) = Surface(onClick = {}, color = Panel2, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth().padding(bottom = 7.dp)) {
    Row(Modifier.padding(9.dp), verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(7.dp).background(Red, CircleShape)); Spacer(Modifier.width(7.dp)); Text(text, color = Color.White, fontSize = 11.sp, maxLines = 1); Spacer(Modifier.weight(1f)); Icon(Icons.Default.ChevronRight, null, tint = Muted, modifier = Modifier.size(16.dp)) }
}

@Composable private fun ModulePage(sector: Sector, tabs: List<String>, title: String, cards: List<String>) {
    var tab by remember(sector.name) { mutableIntStateOf(0) }
    Column(Modifier.fillMaxSize().padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) { Icon(sector.icon, null, tint = Red, modifier = Modifier.size(25.dp)); Spacer(Modifier.width(8.dp)); Text(title, color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.Black) }
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) { tabs.forEachIndexed { i, text -> SegmentedButton(tab == i, { tab = i }, SegmentedButtonDefaults.itemShape(i, tabs.size), label = { Text(text, fontSize = 10.sp, maxLines = 1) }) } }
        Column(Modifier.fillMaxWidth().weight(1f).card().padding(12.dp)) {
            Text(tabs[tab].uppercase(), color = Red, fontWeight = FontWeight.Black, fontSize = 10.sp); Spacer(Modifier.height(8.dp))
            cards.forEach { CompactRow(it) }
            Spacer(Modifier.weight(1f))
            Text("Dados reais serão sincronizados com o servidor REDZONE na próxima etapa.", color = Muted, fontSize = 10.sp)
        }
        Surface(onClick = {}, color = Red, shape = RoundedCornerShape(13.dp), modifier = Modifier.fillMaxWidth().height(46.dp)) {
            Row(horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.Add, null); Spacer(Modifier.width(5.dp)); Text("ADICIONAR", fontWeight = FontWeight.Black) }
        }
    }
}
