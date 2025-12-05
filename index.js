import express from 'express'
import Docker from 'dockerode'

const server = express()
const docker = new Docker()

const getDockerContainers = async () => {
    const containers = await docker.listContainers()
    return containers.filter(container => container.Names[0].startsWith(process.env.CONTAINER_PREFIX))
}

const execContainer = async (containerName, cmd) => {
    try {
        const container = docker.getContainer(containerName)
        const exec = await container.exec({Cmd: cmd, AttachStdout: true, AttachStderr: true})
        const stream = await exec.start()

        return new Promise((resolve, reject) => {
            let output = ''

            stream.on('data', data => {
                output += data.toString()
            })

            stream.on('end', async () => {
                const inspect = await exec.inspect()
                resolve({ output, exitCode: inspect.ExitCode })
            })

            stream.on('error', () => {
                reject()
            })
        })
    } catch (error) {
        return error
    }
}

server.get('/', async (req, res) => {
    const containers = await getDockerContainers()
    res.status(200).send(`
        <h1>Containers</h1>
        ${containers.map(container => `<a class='container-buttons' href='${process.env.USE_HOST_PORT ? `${process.env.HOST}:${process.env.PORT}` : process.env.HOST}/containers/${container.Names[0].replace('/', '')}'>${container.Names[0].replace('/', '')}</a>`)}
    `)
})

server.get('/containers/:container', async (req, res) => {
    const containerName = req.params.container
    const reload = await execContainer('caddy', ['caddy', `reload --config ${process.env.CADDY_PATH}/${containerName}.caddy`])
    if (reload.exitCode === 127) {
        res.redirect(process.env.REDIRECT_PORT ? `${process.env.REDIRECT_HOST}:${process.env.REDIRECT_PORT}` : process.env.REDIRECT_HOST)
    } else {
        res.send(reload.output)
    }
})

server.listen(process.env.PORT)