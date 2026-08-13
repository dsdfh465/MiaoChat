allprojects {
    repositories {
        google()
        mavenCentral()
        // vosk_flutter 原生依赖（vosk-android AAR）
        maven { url = uri("https://alphacephei.com/maven/") }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

// 旧 Android 插件未声明 namespace 时，从 Manifest package 注入（须在 AGP 创建 variant 前生效）
subprojects {
    pluginManager.withPlugin("com.android.library") {
        val android = extensions.findByName("android") ?: return@withPlugin
        val getNamespace =
            android.javaClass.methods.firstOrNull {
                it.name == "getNamespace" && it.parameterCount == 0
            }
        val current = getNamespace?.invoke(android) as? String
        if (!current.isNullOrBlank()) {
            return@withPlugin
        }
        val manifestFile = file("${projectDir}/src/main/AndroidManifest.xml")
        val pkg =
            if (manifestFile.exists()) {
                Regex("""package\s*=\s*"([^"]+)"""")
                    .find(manifestFile.readText())
                    ?.groupValues
                    ?.getOrNull(1)
            } else {
                null
            }
                ?: project.group.toString().takeIf { it.isNotBlank() && it != "unspecified" }
                ?: "com.miaochat.${project.name.replace('-', '_')}"
        val setNamespace =
            android.javaClass.methods.firstOrNull {
                it.name == "setNamespace" && it.parameterCount == 1
            }
        setNamespace?.invoke(android, pkg)
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
