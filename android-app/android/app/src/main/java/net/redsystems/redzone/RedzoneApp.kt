package net.redsystems.redzone

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Red = Color(0xFFFF5358)
private val Dark = Color(0xFF090A0E)
private val Panel = Color(0xFF17191F)
private val Line = Color(0xFF292C35)
private val Muted = Color(0xFFA6A8B1)
private data class Sector(val name: String, val icon: ImageVector)
private val sectors = listOf(
    Sector("Início", Icons.Default.Home), Sector("Treinos", Icons.Default.FitnessCenter),
    Sector("Alimentação", Icons.Default.Restaurant), Sector("Estudos", Icons.Default.School),
    Sector("Rotina", Icons.Default.Schedule), Sector("Batalha", Icons.Default.Whatshot),
    Sector("Perfil", Icons.Default.Person)
)

@Composable fun RedzoneApp() {
    var selected by remember { mutableIntStateOf(0) }
    MaterialTheme(colorScheme = darkColorScheme(primary = Red, background = Dark, surface = Panel)) {
        Scaffold(containerColor = Dark, topBar = { Header(sectors[selected].name) },
            bottomBar = { BottomSectors(selected) { selected = it } }) { inset ->
            Box(Modifier.fillMaxSize().padding(inset).background(Dark)) {
                if (selected == 0) Home() else SectorPage(sectors[selected])
            }
        }
    }
}

@Composable private fun Header(section: String) = Surface(color = Color(0xFF0E0F13), shadowElevation = 8.dp) {
    Row(Modifier.fillMaxWidth().statusBarsPadding().height(58.dp).padding(horizontal = 15.dp), verticalAlignment = Alignment.CenterVertically) {
        Text("RED", color = Red, fontSize = 21.sp, fontWeight = FontWeight.Black)
        Text("ZONE", color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.width(10.dp)); Box(Modifier.width(1.dp).height(22.dp).background(Line)); Spacer(Modifier.width(10.dp))
        Text(section.uppercase(), color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.weight(1f)); Icon(Icons.Default.Notifications, "Notificações", tint = Color.White)
    }
}

@Composable private fun BottomSectors(selected: Int, choose: (Int) -> Unit) = Surface(color = Color(0xFF101116), shadowElevation = 10.dp) {
    Row(Modifier.fillMaxWidth().navigationBarsPadding().height(64.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
        sectors.forEachIndexed { i, item ->
            IconButton({ choose(i) }, Modifier.weight(1f).fillMaxHeight()) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(item.icon, item.name, tint = if (i == selected) Red else Muted, modifier = Modifier.size(20.dp))
                    Text(item.name, color = if (i == selected) Red else Muted, fontSize = 7.5.sp, maxLines = 1, overflow = TextOverflow.Clip)
                }
            }
        }
    }
}

@Composable private fun Home() = Column(Modifier.fillMaxSize().padding(13.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
    Text("Olá, recruta", color = Color.White, fontSize = 23.sp, fontWeight = FontWeight.Black)
    Text("Seu dia em uma única visão", color = Muted, fontSize = 12.sp)
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
        Stat("20", "XP", Modifier.weight(1f)); Stat("0/2500", "Água", Modifier.weight(1f)); Stat("0 dias", "Sequência", Modifier.weight(1f))
    }
    Column(Modifier.fillMaxWidth().background(Brush.horizontalGradient(listOf(Color(0xFF541417), Panel)), RoundedCornerShape(15.dp)).border(1.dp, Color(0xFF6A262A), RoundedCornerShape(15.dp)).padding(13.dp)) {
        Text("PRÓXIMA MISSÃO", color = Red, fontSize = 10.sp, fontWeight = FontWeight.Black)
        Text("Organize seu primeiro objetivo", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Text("O essencial fica visível sem abrir menus.", color = Muted, fontSize = 11.sp)
    }
    Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
        Panel("HOJE", listOf("Treino pendente", "Estudo pendente", "Rotina 0%"), Modifier.weight(1f))
        Panel("ATALHOS", listOf("+ Treino", "+ Estudo", "+ Atividade"), Modifier.weight(1f))
    }
}

@Composable private fun Stat(value: String, label: String, modifier: Modifier) = Column(modifier.background(Panel, RoundedCornerShape(13.dp)).border(1.dp, Line, RoundedCornerShape(13.dp)).padding(9.dp)) {
    Text(value, color = Color.White, fontWeight = FontWeight.Black, fontSize = 15.sp, maxLines = 1); Text(label, color = Muted, fontSize = 9.sp)
}

@Composable private fun Panel(title: String, rows: List<String>, modifier: Modifier) = Column(modifier.background(Panel, RoundedCornerShape(15.dp)).border(1.dp, Line, RoundedCornerShape(15.dp)).padding(11.dp)) {
    Text(title, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Black); Spacer(Modifier.height(7.dp))
    rows.forEach { Surface(onClick = {}, color = Color(0xFF20232B), shape = RoundedCornerShape(9.dp), modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)) {
        Text(it, color = Color.White, fontSize = 11.sp, modifier = Modifier.padding(9.dp), maxLines = 1)
    } }
}

@Composable private fun SectorPage(sector: Sector) {
    var tab by remember(sector.name) { mutableIntStateOf(0) }
    val tabs = when (sector.name) {
        "Treinos" -> listOf("Hoje", "Plano", "Histórico"); "Alimentação" -> listOf("Hoje", "Plano", "Água")
        "Estudos" -> listOf("Hoje", "Matérias", "Relatório"); "Rotina" -> listOf("Hoje", "Calendário", "Alarmes")
        "Batalha" -> listOf("Feed", "Conversas", "Ranking"); else -> listOf("Resumo", "Conquistas", "Ajustes")
    }
    Column(Modifier.fillMaxSize().padding(13.dp), verticalArrangement = Arrangement.spacedBy(11.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) { Icon(sector.icon, null, tint = Red, modifier = Modifier.size(27.dp)); Spacer(Modifier.width(9.dp)); Text(sector.name, color = Color.White, fontSize = 23.sp, fontWeight = FontWeight.Black) }
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) { tabs.forEachIndexed { i, name -> SegmentedButton(tab == i, { tab = i }, SegmentedButtonDefaults.itemShape(i, tabs.size), label = { Text(name, fontSize = 10.sp, maxLines = 1) }) } }
        Column(Modifier.fillMaxWidth().weight(1f).background(Panel, RoundedCornerShape(17.dp)).border(1.dp, Line, RoundedCornerShape(17.dp)).padding(15.dp)) {
            Text(tabs[tab].uppercase(), color = Red, fontSize = 10.sp, fontWeight = FontWeight.Black); Spacer(Modifier.height(7.dp))
            Text("Estrutura nativa pronta", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text("Esta área será conectada diretamente ao servidor REDZONE.", color = Muted, fontSize = 12.sp)
        }
    }
}
